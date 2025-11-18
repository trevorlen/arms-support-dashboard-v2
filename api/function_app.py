import azure.functions as func
import json
import os
import requests
import logging
import hashlib
from base64 import b64encode
from datetime import datetime, timezone
from functools import lru_cache
from time import time

app = func.FunctionApp()

# ============================================================================
# Cache Configuration
# ============================================================================

# Simple in-memory cache with TTL (5 minutes)
_cache = {}
CACHE_TTL = 300  # 5 minutes in seconds

def get_cache_key(url, params):
    """Generate cache key from URL and params"""
    cache_str = f"{url}_{json.dumps(params, sort_keys=True)}"
    return hashlib.md5(cache_str.encode()).hexdigest()

def get_from_cache(cache_key):
    """Get data from cache if not expired"""
    if cache_key in _cache:
        data, timestamp = _cache[cache_key]
        if time() - timestamp < CACHE_TTL:
            logging.info(f"Cache HIT for key: {cache_key[:8]}...")
            return data
        else:
            # Expired, remove from cache
            del _cache[cache_key]
            logging.info(f"Cache EXPIRED for key: {cache_key[:8]}...")
    return None

def set_in_cache(cache_key, data):
    """Store data in cache with timestamp"""
    _cache[cache_key] = (data, time())
    logging.info(f"Cache SET for key: {cache_key[:8]}...")

# ============================================================================
# Helper Functions
# ============================================================================

def get_freshdesk_headers():
    """Generate authentication headers for Freshdesk API"""
    api_key = os.environ.get('FRESHDESK_API_KEY')
    if not api_key:
        return None

    auth_string = f"{api_key}:X"
    encoded_auth = b64encode(auth_string.encode()).decode()
    return {
        "Authorization": f"Basic {encoded_auth}",
        "Content-Type": "application/json"
    }

def check_freshdesk_config():
    """Check if Freshdesk credentials are configured"""
    api_key = os.environ.get('FRESHDESK_API_KEY')
    domain = os.environ.get('FRESHDESK_DOMAIN')
    return bool(api_key) and bool(domain)

def fetch_all_pages_from_freshdesk(base_url, headers, params, max_pages=None):
    """
    Fetch all pages from Freshdesk API with pagination support
    Freshdesk returns max 100 per page. Uses Link header for pagination.

    Args:
        max_pages: Maximum pages to fetch. None = unlimited (fetch all available data)
    """
    all_tickets = []
    page = 1

    while True:
        # Check max_pages limit if set
        if max_pages is not None and page > max_pages:
            logging.info(f"Reached max_pages limit ({max_pages}). Total tickets: {len(all_tickets)}")
            break

        # Add page parameter
        page_params = {**params, 'page': page, 'per_page': 100}  # Request 100 per page (Freshdesk max)

        logging.info(f"📄 Fetching page {page} from Freshdesk...")
        try:
            response = requests.get(base_url, headers=headers, params=page_params, timeout=45)
            response.raise_for_status()
        except requests.exceptions.Timeout:
            logging.error(f"⏱️ Timeout on page {page}. Returning {len(all_tickets)} tickets.")
            break
        except requests.exceptions.RequestException as e:
            logging.error(f"❌ Error on page {page}: {e}. Returning {len(all_tickets)} tickets.")
            break

        page_data = response.json()

        if not page_data or len(page_data) == 0:
            logging.info(f"✅ No more data on page {page}. Total: {len(all_tickets)} tickets")
            break

        all_tickets.extend(page_data)
        logging.info(f"✅ Page {page}: +{len(page_data)} tickets | Total: {len(all_tickets)}")

        # Check Link header for next page
        link_header = response.headers.get('Link', '')
        if 'rel="next"' not in link_header:
            logging.info(f"🏁 Last page reached. Total: {len(all_tickets)} tickets")
            break

        page += 1

        # Warning for very large datasets
        if page > 100:
            logging.warning(f"⚠️ Fetching page {page} (10,000+ tickets)...")

    logging.info(f"🎉 Complete! {len(all_tickets)} tickets from {page} pages")
    return all_tickets

def get_custom_field_value(custom_fields, field_prefix):
    """
    Get custom field value by prefix (handles field names with IDs appended)
    Example: 'cf_platform' matches 'cf_platform627919'
    """
    if not custom_fields:
        return None

    # First try exact match
    if field_prefix in custom_fields:
        return custom_fields[field_prefix]

    # Then try prefix match (for fields with IDs appended)
    for key, value in custom_fields.items():
        if key.startswith(field_prefix):
            return value

    return None

def process_ticket(ticket, domain):
    """Process ticket data - add computed fields"""
    # Map status codes to names
    status_map = {2: 'Open', 3: 'Pending', 4: 'Resolved', 5: 'Closed'}
    ticket['status_name'] = status_map.get(ticket.get('status'), 'Unknown')

    # Map priority codes to names
    priority_map = {1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent'}
    ticket['priority_name'] = priority_map.get(ticket.get('priority'), 'Unknown')

    # Process custom fields (handles both 'cf_platform' and 'cf_platform627919' formats)
    cf = ticket.get('custom_fields', {})

    ticket['platform'] = get_custom_field_value(cf, 'cf_platform') or 'Unknown'
    ticket['league'] = get_custom_field_value(cf, 'cf_league') or 'Unknown'
    ticket['custom_ticket_type'] = get_custom_field_value(cf, 'cf_ticket_type') or 'Unknown'
    ticket['issue_type'] = get_custom_field_value(cf, 'cf_issue_type') or 'Unknown'
    ticket['type_detail'] = get_custom_field_value(cf, 'cf_description') or 'Unknown'
    ticket['dev_assistance_needed'] = get_custom_field_value(cf, 'cf_dev_assistance_needed') or False

    # Add Freshdesk URL
    ticket['freshdesk_url'] = f"https://{domain}.freshdesk.com/a/tickets/{ticket['id']}"

    return ticket

# ============================================================================
# API Endpoints
# ============================================================================

@app.route(route="health", auth_level=func.AuthLevel.ANONYMOUS)
def health(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint"""
    logging.info('Health check requested')

    freshdesk_configured = check_freshdesk_config()

    health_status = {
        "status": "healthy",
        "service": "ARMS Support Dashboard API",
        "freshdesk_configured": freshdesk_configured,
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    return func.HttpResponse(
        body=json.dumps(health_status),
        mimetype="application/json",
        status_code=200
    )


@app.route(route="stats", auth_level=func.AuthLevel.ANONYMOUS)
def stats(req: func.HttpRequest) -> func.HttpResponse:
    """Return API configuration and stats"""
    logging.info('Stats requested')

    stats_data = {
        "freshdesk_configured": check_freshdesk_config(),
        "freshdesk_domain": os.environ.get('FRESHDESK_DOMAIN', 'Not configured'),
        "api_version": "2.0.0",
        "environment": "Azure Functions",
        "python_version": os.sys.version
    }

    return func.HttpResponse(
        body=json.dumps(stats_data),
        mimetype="application/json",
        status_code=200
    )


@app.route(route="tickets", auth_level=func.AuthLevel.ANONYMOUS)
def tickets(req: func.HttpRequest) -> func.HttpResponse:
    """Fetch tickets from Freshdesk with filters"""
    logging.info('Tickets endpoint called')

    # Check configuration
    if not check_freshdesk_config():
        return func.HttpResponse(
            body=json.dumps({"error": "Freshdesk credentials not configured"}),
            mimetype="application/json",
            status_code=500
        )

    domain = os.environ.get('FRESHDESK_DOMAIN')
    headers = get_freshdesk_headers()

    # Get query parameters
    start_date = req.params.get('start_date')
    end_date = req.params.get('end_date')
    status_filter = req.params.get('status')
    priority_filter = req.params.get('priority')
    platform_filter = req.params.get('platform')
    league_filter = req.params.get('league')
    group_id_filter = req.params.get('group_id')

    # Build Freshdesk API URL
    base_url = f"https://{domain}.freshdesk.com/api/v2/tickets"

    # Build query parameters for Freshdesk
    params = {}
    if start_date:
        params['updated_since'] = start_date

    try:
        # Check cache first
        cache_key = get_cache_key(base_url, params)
        cached_data = get_from_cache(cache_key)

        if cached_data is not None:
            tickets_data = cached_data
            logging.info(f"Using {len(tickets_data)} cached tickets")
        else:
            # Fetch all pages from Freshdesk with pagination
            logging.info(f"Fetching tickets from Freshdesk with pagination: {base_url}")
            tickets_data = fetch_all_pages_from_freshdesk(base_url, headers, params, max_pages=10)
            logging.info(f"Fetched total of {len(tickets_data)} tickets from Freshdesk")

            # Cache the results
            set_in_cache(cache_key, tickets_data)

        # Process each ticket
        processed_tickets = [process_ticket(ticket, domain) for ticket in tickets_data]

        # Apply client-side filters
        filtered_tickets = processed_tickets

        if group_id_filter:
            filtered_tickets = [t for t in filtered_tickets if str(t.get('group_id')) == group_id_filter]

        if status_filter:
            filtered_tickets = [t for t in filtered_tickets if str(t.get('status')) == status_filter]

        if priority_filter:
            filtered_tickets = [t for t in filtered_tickets if str(t.get('priority')) == priority_filter]

        if platform_filter:
            filtered_tickets = [t for t in filtered_tickets if t.get('platform') == platform_filter]

        if league_filter:
            filtered_tickets = [t for t in filtered_tickets if t.get('league') == league_filter]

        logging.info(f"Returning {len(filtered_tickets)} tickets after filtering")

        return func.HttpResponse(
            body=json.dumps({"data": filtered_tickets}),
            mimetype="application/json",
            status_code=200
        )

    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to fetch tickets: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": f"Failed to fetch tickets: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )


@app.route(route="ticket/{id}", auth_level=func.AuthLevel.ANONYMOUS)
def ticket(req: func.HttpRequest) -> func.HttpResponse:
    """Fetch single ticket with conversations"""
    logging.info('Ticket detail endpoint called')

    # Check configuration
    if not check_freshdesk_config():
        return func.HttpResponse(
            body=json.dumps({"error": "Freshdesk credentials not configured"}),
            mimetype="application/json",
            status_code=500
        )

    domain = os.environ.get('FRESHDESK_DOMAIN')
    headers = get_freshdesk_headers()

    # Get ticket ID from route parameter
    ticket_id = req.route_params.get('id')

    if not ticket_id:
        return func.HttpResponse(
            body=json.dumps({"error": "Ticket ID is required"}),
            mimetype="application/json",
            status_code=400
        )

    try:
        # Fetch ticket details
        ticket_url = f"https://{domain}.freshdesk.com/api/v2/tickets/{ticket_id}"
        logging.info(f"Fetching ticket: {ticket_url}")
        ticket_response = requests.get(ticket_url, headers=headers, timeout=30)
        ticket_response.raise_for_status()
        ticket_data = ticket_response.json()

        # Process ticket
        processed_ticket = process_ticket(ticket_data, domain)

        # Fetch conversations
        conversations_url = f"https://{domain}.freshdesk.com/api/v2/tickets/{ticket_id}/conversations"
        logging.info(f"Fetching conversations: {conversations_url}")
        conv_response = requests.get(conversations_url, headers=headers, timeout=30)
        conv_response.raise_for_status()
        conversations = conv_response.json()

        # Count agent interactions (responses from agents, not customers)
        agent_interactions_count = len([
            conv for conv in conversations
            if conv.get('user_id') is not None  # Agent response
            and not conv.get('private', False)  # Exclude private notes
        ])
        logging.info(f"💬 Ticket {ticket_id} has {agent_interactions_count} agent interactions")

        # Combine data
        result = {
            "ticket": processed_ticket,
            "conversations": conversations,
            "agent_interactions_count": agent_interactions_count
        }

        return func.HttpResponse(
            body=json.dumps(result),
            mimetype="application/json",
            status_code=200
        )

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            logging.warning(f"Ticket not found: {ticket_id}")
            return func.HttpResponse(
                body=json.dumps({"error": "Ticket not found"}),
                mimetype="application/json",
                status_code=404
            )
        logging.error(f"HTTP error fetching ticket: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": f"Failed to fetch ticket: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )
    except requests.exceptions.RequestException as e:
        logging.error(f"Request error: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": f"Request failed: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )


@app.route(route="summary", auth_level=func.AuthLevel.ANONYMOUS)
def summary(req: func.HttpRequest) -> func.HttpResponse:
    """Generate summary statistics from tickets"""
    logging.info('Summary endpoint called')

    # Check configuration
    if not check_freshdesk_config():
        return func.HttpResponse(
            body=json.dumps({"error": "Freshdesk credentials not configured"}),
            mimetype="application/json",
            status_code=500
        )

    domain = os.environ.get('FRESHDESK_DOMAIN')
    headers = get_freshdesk_headers()

    # Get date range and filters
    start_date = req.params.get('start_date')
    end_date = req.params.get('end_date')
    group_id_filter = req.params.get('group_id')

    # Build Freshdesk API URL
    base_url = f"https://{domain}.freshdesk.com/api/v2/tickets"

    params = {'include': 'stats'}  # Include stats for agent_responded count
    if start_date:
        params['updated_since'] = start_date

    try:
        # Check cache first
        cache_key = get_cache_key(base_url, params)
        cached_data = get_from_cache(cache_key)

        if cached_data is not None:
            tickets_data = cached_data
            logging.info(f"Using {len(tickets_data)} cached tickets for summary")
        else:
            # Fetch all pages from Freshdesk with pagination
            logging.info(f"Fetching tickets for summary with pagination (including stats): {base_url}")
            tickets_data = fetch_all_pages_from_freshdesk(base_url, headers, params, max_pages=None)
            logging.info(f"Fetched total of {len(tickets_data)} tickets for summary")

            # Cache the results
            set_in_cache(cache_key, tickets_data)

        logging.info(f"Processing {len(tickets_data)} tickets for summary")

        # Apply group_id filter if specified
        if group_id_filter:
            tickets_data = [t for t in tickets_data if str(t.get('group_id')) == group_id_filter]
            logging.info(f"Filtered to {len(tickets_data)} tickets for group_id {group_id_filter}")

        # Calculate response times from first_responded_at field
        response_times = []
        total_agent_interactions = 0

        for ticket in tickets_data:
            stats = ticket.get('stats', {})

            # Calculate first response time (from stats.first_responded_at)
            first_responded_at = stats.get('first_responded_at')
            created_at = ticket.get('created_at')

            if first_responded_at and created_at:
                try:
                    created = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    responded = datetime.fromisoformat(first_responded_at.replace('Z', '+00:00'))
                    response_time_seconds = (responded - created).total_seconds()
                    if response_time_seconds > 0:  # Only count positive values
                        response_times.append(response_time_seconds)
                except (ValueError, AttributeError) as e:
                    logging.warning(f"Error parsing dates for ticket {ticket.get('id')}: {e}")

            # Count agent interactions (count tickets where agent responded at least once)
            # Since there's no agent_responded count field, we count tickets with agent_responded_at
            if stats.get('agent_responded_at'):
                total_agent_interactions += 1  # At least one agent response per ticket

        # Calculate response time statistics
        avg_response_time = None
        median_response_time = None
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            sorted_times = sorted(response_times)
            mid = len(sorted_times) // 2
            median_response_time = sorted_times[mid] if len(sorted_times) % 2 else (sorted_times[mid-1] + sorted_times[mid]) / 2
            logging.info(f"📊 Calculated response times - Avg: {avg_response_time/3600:.2f}h, Median: {median_response_time/3600:.2f}h from {len(response_times)} tickets")

        logging.info(f"💬 Total agent interactions: {total_agent_interactions} across {len(tickets_data)} tickets")

        # Calculate summary statistics (structured for frontend compatibility)
        total_count = len(tickets_data)
        resolved_count = len([t for t in tickets_data if t.get('status') in [4, 5]])

        summary_data = {
            "data": {
                "tickets": {
                    "total": total_count,
                    "created": total_count,  # Same as total for current period
                    "resolved": resolved_count,
                    "open": len([t for t in tickets_data if t.get('status') == 2]),
                    "pending": len([t for t in tickets_data if t.get('status') == 3]),
                    "created_change": 0,  # TODO: Calculate vs previous period
                    "resolved_change": 0   # TODO: Calculate vs previous period
                },
                "response_time": {
                    "first": avg_response_time,  # Average first response time in seconds
                    "average": avg_response_time,  # Same as first for now
                    "median": median_response_time  # Median response time (more accurate)
                },
                "agent_interactions": total_agent_interactions,  # Total agent responses across all tickets
                "priorities": {
                    "high": len([t for t in tickets_data if t.get('priority') >= 3]),
                    "urgent": len([t for t in tickets_data if t.get('priority') == 4]),
                    "medium": len([t for t in tickets_data if t.get('priority') == 2]),
                    "low": len([t for t in tickets_data if t.get('priority') == 1])
                },
                "issues": {
                    "system": 0,
                    "user": 0,
                    "dev_assistance_needed": 0
                },
                "platforms": {},
                "leagues": {},
                "issue_types": {}
            }
        }

        # Process custom fields using processed tickets
        processed_tickets = [process_ticket(t, domain) for t in tickets_data]

        for ticket in processed_tickets:
            # Count issue types
            issue_type = ticket.get('issue_type', 'Unknown')
            if issue_type == 'System Issue':
                summary_data['data']['issues']['system'] += 1
            elif issue_type == 'User Issue':
                summary_data['data']['issues']['user'] += 1

            summary_data['data']['issue_types'][issue_type] = summary_data['data']['issue_types'].get(issue_type, 0) + 1

            # Count platforms
            platform = ticket.get('platform', 'Unknown')
            if platform != 'Unknown':
                summary_data['data']['platforms'][platform] = summary_data['data']['platforms'].get(platform, 0) + 1

            # Count leagues
            league = ticket.get('league', 'Unknown')
            if league and league != 'Unknown':
                summary_data['data']['leagues'][league] = summary_data['data']['leagues'].get(league, 0) + 1

            # Count dev assistance needed
            dev_needed = ticket.get('dev_assistance_needed')
            if dev_needed and str(dev_needed).lower() in ['yes', 'true', '1']:
                summary_data['data']['issues']['dev_assistance_needed'] += 1

        logging.info(f"Summary generated successfully")

        # Add backward-compatible top-level fields and aliases
        summary_data['data']['system_issues'] = summary_data['data']['issues']['system']
        summary_data['data']['user_issues'] = summary_data['data']['issues']['user']
        summary_data['data']['by_platform'] = summary_data['data']['platforms']  # Alias for backward compatibility
        summary_data['data']['by_league'] = summary_data['data']['leagues']      # Alias for backward compatibility
        summary_data['data']['by_type'] = summary_data['data']['issue_types']    # Alias for backward compatibility

        return func.HttpResponse(
            body=json.dumps(summary_data),
            mimetype="application/json",
            status_code=200
        )

    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to generate summary: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": f"Failed to generate summary: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )

# ============================================================================
# Azure DevOps Work Items Endpoint
# ============================================================================

@app.route(route="devops", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def get_devops_items(req: func.HttpRequest) -> func.HttpResponse:
    """
    Fetch Azure DevOps work items tagged with 'ProdSupport'
    Returns: List of work items with ID, date, title, type, status, and linked FD ticket
    """
    logging.info("Fetching Azure DevOps work items")

    # Check for Azure DevOps credentials
    org = os.environ.get('AZURE_DEVOPS_ORG')
    project = os.environ.get('AZURE_DEVOPS_PROJECT')
    pat = os.environ.get('AZURE_DEVOPS_PAT')

    if not all([org, project, pat]):
        logging.warning("Azure DevOps credentials not configured")
        return func.HttpResponse(
            body=json.dumps({"error": "Azure DevOps credentials not configured"}),
            mimetype="application/json",
            status_code=500
        )

    try:
        # Azure DevOps API setup
        base_url = f"https://dev.azure.com/{org}/{project}/_apis"
        auth = ('', pat)  # Username is empty for PAT authentication
        headers = {'Content-Type': 'application/json'}

        # WIQL query to get work items with ProdSupport tag
        wiql_query = {
            "query": """
                SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
                       [System.CreatedDate], [System.Tags], [Custom.FreshdeskLink], [System.AssignedTo]
                FROM WorkItems
                WHERE [System.Tags] CONTAINS 'ProdSupport'
                  AND [System.WorkItemType] IN ('Bug', 'Task', 'Product Backlog Item')
                  AND [System.State] NOT IN ('Done', 'Removed')
                ORDER BY [System.CreatedDate] DESC
            """
        }

        # Execute WIQL query
        wiql_url = f"{base_url}/wit/wiql?api-version=7.0"
        logging.info(f"Querying Azure DevOps: {wiql_url}")

        wiql_response = requests.post(
            wiql_url,
            auth=auth,
            headers=headers,
            json=wiql_query,
            timeout=30
        )
        wiql_response.raise_for_status()
        wiql_data = wiql_response.json()

        work_item_ids = [item['id'] for item in wiql_data.get('workItems', [])]
        logging.info(f"Found {len(work_item_ids)} work items with ProdSupport tag")

        if not work_item_ids:
            return func.HttpResponse(
                body=json.dumps({
                    "success": True,
                    "data": [],
                    "count": 0
                }),
                mimetype="application/json",
                status_code=200
            )

        # Get full work item details (batch request)
        # Azure DevOps API allows max 200 IDs per batch
        all_work_items = []
        batch_size = 200

        for i in range(0, len(work_item_ids), batch_size):
            batch_ids = work_item_ids[i:i + batch_size]
            ids_param = ','.join(map(str, batch_ids))

            details_url = f"{base_url}/wit/workitems?ids={ids_param}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.CreatedDate,System.Tags,Custom.FreshdeskLink,System.AssignedTo&api-version=7.0"

            details_response = requests.get(
                details_url,
                auth=auth,
                headers=headers,
                timeout=30
            )
            details_response.raise_for_status()
            batch_items = details_response.json().get('value', [])
            all_work_items.extend(batch_items)

        # Process and format work items
        processed_items = []
        for item in all_work_items:
            fields = item.get('fields', {})

            # Extract Freshdesk ticket ID from Custom.FreshdeskLink
            freshdesk_link = fields.get('Custom.FreshdeskLink', '')
            freshdesk_ticket_id = freshdesk_link if freshdesk_link else None

            # Extract assigned user (System.AssignedTo is an object with displayName)
            assigned_to_obj = fields.get('System.AssignedTo', {})
            assigned_to = assigned_to_obj.get('displayName', 'Unassigned') if assigned_to_obj else 'Unassigned'

            processed_item = {
                'id': item.get('id'),
                'title': fields.get('System.Title', 'Untitled'),
                'work_item_type': fields.get('System.WorkItemType', 'Unknown'),
                'state': fields.get('System.State', 'Unknown'),
                'created_date': fields.get('System.CreatedDate'),
                'tags': fields.get('System.Tags', ''),
                'freshdesk_ticket_id': freshdesk_ticket_id,
                'assigned_to': assigned_to,
                'url': f"https://dev.azure.com/{org}/{project}/_workitems/edit/{item.get('id')}"
            }
            processed_items.append(processed_item)

        logging.info(f"Successfully processed {len(processed_items)} DevOps work items")

        return func.HttpResponse(
            body=json.dumps({
                "success": True,
                "data": processed_items,
                "count": len(processed_items)
            }),
            mimetype="application/json",
            status_code=200
        )

    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to fetch DevOps items: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": f"Failed to fetch DevOps items: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )
    except Exception as e:
        logging.error(f"Unexpected error fetching DevOps items: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": f"Unexpected error: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )
