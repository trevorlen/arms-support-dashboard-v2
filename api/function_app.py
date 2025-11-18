import azure.functions as func
import json
import os
import requests
import logging
from base64 import b64encode
from datetime import datetime, timezone

app = func.FunctionApp()

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
    ticket['issue_type'] = get_custom_field_value(cf, 'cf_issue_type') or 'Unknown'
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

    # Build Freshdesk API URL
    base_url = f"https://{domain}.freshdesk.com/api/v2/tickets"

    # Build query parameters for Freshdesk
    params = {}
    if start_date:
        params['updated_since'] = start_date

    try:
        # Fetch tickets from Freshdesk
        logging.info(f"Fetching tickets from Freshdesk: {base_url}")
        response = requests.get(base_url, headers=headers, params=params, timeout=30)
        response.raise_for_status()

        tickets_data = response.json()
        logging.info(f"Fetched {len(tickets_data)} tickets from Freshdesk")

        # Process each ticket
        processed_tickets = [process_ticket(ticket, domain) for ticket in tickets_data]

        # Apply client-side filters
        filtered_tickets = processed_tickets

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
            body=json.dumps(filtered_tickets),
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

        # Combine data
        result = {
            "ticket": processed_ticket,
            "conversations": conversations
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

    # Get date range
    start_date = req.params.get('start_date')
    end_date = req.params.get('end_date')

    # Build Freshdesk API URL
    base_url = f"https://{domain}.freshdesk.com/api/v2/tickets"

    params = {}
    if start_date:
        params['updated_since'] = start_date

    try:
        # Fetch tickets
        logging.info(f"Fetching tickets for summary: {base_url}")
        response = requests.get(base_url, headers=headers, params=params, timeout=30)
        response.raise_for_status()
        tickets_data = response.json()

        logging.info(f"Processing {len(tickets_data)} tickets for summary")

        # Calculate summary statistics
        summary_data = {
            "total_tickets": len(tickets_data),
            "open_tickets": len([t for t in tickets_data if t.get('status') == 2]),
            "pending_tickets": len([t for t in tickets_data if t.get('status') == 3]),
            "resolved_tickets": len([t for t in tickets_data if t.get('status') in [4, 5]]),
            "high_priority": len([t for t in tickets_data if t.get('priority') >= 3]),
            "urgent_priority": len([t for t in tickets_data if t.get('priority') == 4]),
            "system_issues": 0,
            "user_issues": 0,
            "dev_assistance_needed": 0,
            "platforms": {},
            "leagues": {},
            "issue_types": {}
        }

        # Process custom fields
        for ticket in tickets_data:
            if ticket.get('custom_fields'):
                cf = ticket['custom_fields']

                # Count issue types
                issue_type = cf.get('cf_issue_type', 'Unknown')
                if issue_type == 'System Issue':
                    summary_data['system_issues'] += 1
                elif issue_type == 'User Issue':
                    summary_data['user_issues'] += 1

                summary_data['issue_types'][issue_type] = summary_data['issue_types'].get(issue_type, 0) + 1

                # Count platforms
                platform = cf.get('cf_platform', 'Unknown')
                summary_data['platforms'][platform] = summary_data['platforms'].get(platform, 0) + 1

                # Count leagues
                league = cf.get('cf_league', 'Unknown')
                summary_data['leagues'][league] = summary_data['leagues'].get(league, 0) + 1

                # Count dev assistance needed
                if cf.get('cf_dev_assistance_needed'):
                    summary_data['dev_assistance_needed'] += 1

        logging.info(f"Summary generated successfully")

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
