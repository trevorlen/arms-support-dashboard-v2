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
from utils import auth

app = func.FunctionApp()

# ============================================================================
# Cache Configuration
# ============================================================================

# Simple in-memory cache with TTL
_cache = {}
CACHE_TTL_CURRENT = 300  # 5 minutes for current year tickets
CACHE_TTL_HISTORICAL = 86400  # 24 hours for historical (2024) tickets

def get_cache_key(url, params, include_historical=False):
    """Generate cache key from URL and params with historical flag"""
    cache_str = f"{url}_{json.dumps(params, sort_keys=True)}_historical_{include_historical}"
    return hashlib.md5(cache_str.encode()).hexdigest()

def get_from_cache(cache_key, ttl=None):
    """Get data from cache if not expired"""
    if cache_key in _cache:
        data, timestamp = _cache[cache_key]
        cache_ttl = ttl if ttl is not None else CACHE_TTL_CURRENT
        if time() - timestamp < cache_ttl:
            logging.info(f"Cache HIT for key: {cache_key[:8]}... (TTL: {cache_ttl}s)")
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

def get_auth_user(req: func.HttpRequest):
    """
    Extract and verify JWT token from Authorization header.
    Returns user payload if valid, None otherwise.
    """
    auth_header = req.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header.replace('Bearer ', '')
    return auth.verify_token(token)

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
            response = requests.get(base_url, headers=headers, params=page_params, timeout=60)
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
    # Make sure we match the field_prefix followed by only digits to avoid confusion
    for key, value in custom_fields.items():
        if key.startswith(field_prefix):
            # Check if the rest is just digits (e.g., cf_platform627919)
            suffix = key[len(field_prefix):]
            if not suffix or suffix.isdigit():
                return value

    return None

def process_ticket(ticket, domain):
    """Process ticket data - add computed fields"""
    # Map status codes to names
    status_map = {
        2: 'Open',
        3: 'Pending',
        4: 'Resolved',
        5: 'Closed',
        6: 'Escalated',
        7: 'Awaiting Information',
        8: 'Review Response',
        9: 'Waiting on Customer',
        10: 'Waiting on Third Party',
        11: 'On-Hold',
        12: 'In Backlog'
    }
    ticket['status_name'] = status_map.get(ticket.get('status'), 'Unknown')

    # Map priority codes to names
    priority_map = {1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent'}
    ticket['priority_name'] = priority_map.get(ticket.get('priority'), 'Unknown')

    # Process custom fields (handles both 'cf_platform' and 'cf_platform627919' formats)
    cf = ticket.get('custom_fields', {})

    ticket['platform'] = get_custom_field_value(cf, 'cf_platform') or 'Unknown'
    ticket['league'] = get_custom_field_value(cf, 'cf_league') or 'Unknown'
    ticket['team'] = get_custom_field_value(cf, 'cf_team') or 'Unknown'
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

# ============================================================================
# Authentication Endpoints
# ============================================================================

@app.route(route="auth/login", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def auth_login(req: func.HttpRequest) -> func.HttpResponse:
    """Authenticate user and return JWT token"""
    logging.info('Login attempt')

    try:
        req_body = req.get_json()
        username = req_body.get('username')
        password = req_body.get('password')

        if not username or not password:
            return func.HttpResponse(
                body=json.dumps({"error": "Username and password are required"}),
                mimetype="application/json",
                status_code=400
            )

        # Get user
        user = auth.get_user_by_username(username)
        if not user:
            logging.warning(f'Login failed: user not found - {username}')
            return func.HttpResponse(
                body=json.dumps({"error": "Invalid credentials"}),
                mimetype="application/json",
                status_code=401
            )

        # Verify password
        if not auth.verify_password(password, user['password_hash']):
            logging.warning(f'Login failed: invalid password - {username}')
            return func.HttpResponse(
                body=json.dumps({"error": "Invalid credentials"}),
                mimetype="application/json",
                status_code=401
            )

        # Update last login timestamp
        auth.update_last_login(user['id'])

        # Generate token
        token_data = {
            'id': user['id'],
            'username': user['username'],
            'role': user['role']
        }
        token = auth.generate_token(token_data)

        # Return user data and token
        logging.info(f'Login successful - {username}')
        return func.HttpResponse(
            body=json.dumps({
                "token": token,
                "user": {
                    "id": user['id'],
                    "username": user['username'],
                    "full_name": user['full_name'],
                    "role": user['role'],
                    "must_change_password": user.get('must_change_password', False)
                }
            }),
            mimetype="application/json",
            status_code=200
        )

    except ValueError as e:
        logging.error(f'Login error: Invalid request body - {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": "Invalid request body"}),
            mimetype="application/json",
            status_code=400
        )
    except Exception as e:
        logging.error(f'Login error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": "Login failed"}),
            mimetype="application/json",
            status_code=500
        )


@app.route(route="auth/me", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def auth_me(req: func.HttpRequest) -> func.HttpResponse:
    """Get current authenticated user"""
    logging.info('Auth me requested')

    try:
        # Verify token
        user_payload = get_auth_user(req)
        if not user_payload:
            return func.HttpResponse(
                body=json.dumps({"error": "Unauthorized"}),
                mimetype="application/json",
                status_code=401
            )

        # Get fresh user data
        user = auth.get_user_by_id(user_payload['user_id'])
        if not user:
            return func.HttpResponse(
                body=json.dumps({"error": "User not found"}),
                mimetype="application/json",
                status_code=404
            )

        return func.HttpResponse(
            body=json.dumps({
                "user": {
                    "id": user['id'],
                    "username": user['username'],
                    "full_name": user['full_name'],
                    "role": user['role']
                }
            }),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:
        logging.error(f'Auth me error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": "Failed to get user"}),
            mimetype="application/json",
            status_code=500
        )


@app.route(route="auth/logout", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def auth_logout(req: func.HttpRequest) -> func.HttpResponse:
    """Logout user (client-side token removal)"""
    logging.info('Logout requested')

    # JWT is stateless, so logout is handled client-side by removing the token
    # This endpoint exists for consistency and future enhancements (e.g., token blacklist)
    return func.HttpResponse(
        body=json.dumps({"message": "Logged out successfully"}),
        mimetype="application/json",
        status_code=200
    )


@app.route(route="auth/change-password", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def auth_change_password(req: func.HttpRequest) -> func.HttpResponse:
    """Change user password"""
    logging.info('Password change attempt')

    # Verify authentication
    user_payload = get_auth_user(req)
    if not user_payload:
        return func.HttpResponse(
            body=json.dumps({"error": "Unauthorized"}),
            mimetype="application/json",
            status_code=401
        )

    try:
        req_body = req.get_json()
        current_password = req_body.get('current_password')
        new_password = req_body.get('new_password')

        if not current_password or not new_password:
            return func.HttpResponse(
                body=json.dumps({"error": "Current password and new password are required"}),
                mimetype="application/json",
                status_code=400
            )

        # Validate new password strength
        if len(new_password) < 8:
            return func.HttpResponse(
                body=json.dumps({"error": "New password must be at least 8 characters long"}),
                mimetype="application/json",
                status_code=400
            )

        # Get user
        user = auth.get_user_by_id(user_payload['user_id'])
        if not user:
            return func.HttpResponse(
                body=json.dumps({"error": "User not found"}),
                mimetype="application/json",
                status_code=404
            )

        # Verify current password
        if not auth.verify_password(current_password, user['password_hash']):
            logging.warning(f'Password change failed: invalid current password - {user["username"]}')
            return func.HttpResponse(
                body=json.dumps({"error": "Current password is incorrect"}),
                mimetype="application/json",
                status_code=401
            )

        # Update password
        auth.update_user(user['id'], {'password': new_password})

        logging.info(f'Password changed successfully - {user["username"]}')
        return func.HttpResponse(
            body=json.dumps({"message": "Password changed successfully"}),
            mimetype="application/json",
            status_code=200
        )

    except ValueError as e:
        logging.error(f'Password change error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": "Invalid request body"}),
            mimetype="application/json",
            status_code=400
        )
    except Exception as e:
        logging.error(f'Password change error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": "Internal server error"}),
            mimetype="application/json",
            status_code=500
        )


# ============================================================================
# User Management Endpoints (Admin Only)
# ============================================================================

@app.route(route="users", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def users_list(req: func.HttpRequest) -> func.HttpResponse:
    """Get all users (Admin only)"""
    logging.info('List users requested')

    try:
        # Verify token and check admin role
        user_payload = get_auth_user(req)
        if not user_payload:
            return func.HttpResponse(
                body=json.dumps({"error": "Unauthorized"}),
                mimetype="application/json",
                status_code=401
            )

        if user_payload.get('role') != 'Admin':
            return func.HttpResponse(
                body=json.dumps({"error": "Forbidden - Admin access required"}),
                mimetype="application/json",
                status_code=403
            )

        # Get all users
        users = auth.get_all_users()

        return func.HttpResponse(
            body=json.dumps({"users": users}),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:
        logging.error(f'List users error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": "Failed to list users"}),
            mimetype="application/json",
            status_code=500
        )


@app.route(route="users", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def users_create(req: func.HttpRequest) -> func.HttpResponse:
    """Create new user (Admin only)"""
    logging.info('Create user requested')

    try:
        # Verify token and check admin role
        user_payload = get_auth_user(req)
        if not user_payload:
            return func.HttpResponse(
                body=json.dumps({"error": "Unauthorized"}),
                mimetype="application/json",
                status_code=401
            )

        if user_payload.get('role') != 'Admin':
            return func.HttpResponse(
                body=json.dumps({"error": "Forbidden - Admin access required"}),
                mimetype="application/json",
                status_code=403
            )

        # Get request body
        req_body = req.get_json()
        username = req_body.get('username')
        password = req_body.get('password')
        full_name = req_body.get('full_name')
        role = req_body.get('role')

        if not username or not password or not full_name or not role:
            return func.HttpResponse(
                body=json.dumps({"error": "username, password, full_name, and role are required"}),
                mimetype="application/json",
                status_code=400
            )

        # Create user
        new_user = auth.create_user(username, password, full_name, role)

        logging.info(f'User created: {username}')
        return func.HttpResponse(
            body=json.dumps({"user": new_user}),
            mimetype="application/json",
            status_code=201
        )

    except ValueError as e:
        logging.error(f'Create user error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": str(e)}),
            mimetype="application/json",
            status_code=400
        )
    except Exception as e:
        logging.error(f'Create user error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": "Failed to create user"}),
            mimetype="application/json",
            status_code=500
        )


@app.route(route="users/{user_id}", methods=["PUT"], auth_level=func.AuthLevel.ANONYMOUS)
def users_update(req: func.HttpRequest) -> func.HttpResponse:
    """Update user (Admin only)"""
    user_id = req.route_params.get('user_id')
    logging.info(f'Update user requested: {user_id}')

    try:
        # Verify token and check admin role
        user_payload = get_auth_user(req)
        if not user_payload:
            return func.HttpResponse(
                body=json.dumps({"error": "Unauthorized"}),
                mimetype="application/json",
                status_code=401
            )

        if user_payload.get('role') != 'Admin':
            return func.HttpResponse(
                body=json.dumps({"error": "Forbidden - Admin access required"}),
                mimetype="application/json",
                status_code=403
            )

        # Get request body
        req_body = req.get_json()
        updates = {}

        # Collect allowed updates
        if 'username' in req_body:
            updates['username'] = req_body['username']
        if 'full_name' in req_body:
            updates['full_name'] = req_body['full_name']
        if 'role' in req_body:
            updates['role'] = req_body['role']
        if 'password' in req_body:
            updates['password'] = req_body['password']
        if 'must_change_password' in req_body:
            updates['must_change_password'] = req_body['must_change_password']

        if not updates:
            return func.HttpResponse(
                body=json.dumps({"error": "No valid fields to update"}),
                mimetype="application/json",
                status_code=400
            )

        # Update user
        updated_user = auth.update_user(user_id, updates)

        if not updated_user:
            return func.HttpResponse(
                body=json.dumps({"error": "User not found"}),
                mimetype="application/json",
                status_code=404
            )

        logging.info(f'User updated: {user_id}')
        return func.HttpResponse(
            body=json.dumps({"user": updated_user}),
            mimetype="application/json",
            status_code=200
        )

    except ValueError as e:
        logging.error(f'Update user error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": str(e)}),
            mimetype="application/json",
            status_code=400
        )
    except Exception as e:
        logging.error(f'Update user error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": "Failed to update user"}),
            mimetype="application/json",
            status_code=500
        )


@app.route(route="users/{user_id}", methods=["DELETE"], auth_level=func.AuthLevel.ANONYMOUS)
def users_delete(req: func.HttpRequest) -> func.HttpResponse:
    """Delete user (Admin only)"""
    user_id = req.route_params.get('user_id')
    logging.info(f'Delete user requested: {user_id}')

    try:
        # Verify token and check admin role
        user_payload = get_auth_user(req)
        if not user_payload:
            return func.HttpResponse(
                body=json.dumps({"error": "Unauthorized"}),
                mimetype="application/json",
                status_code=401
            )

        if user_payload.get('role') != 'Admin':
            return func.HttpResponse(
                body=json.dumps({"error": "Forbidden - Admin access required"}),
                mimetype="application/json",
                status_code=403
            )

        # Prevent self-deletion
        if user_payload.get('user_id') == user_id:
            return func.HttpResponse(
                body=json.dumps({"error": "Cannot delete your own account"}),
                mimetype="application/json",
                status_code=400
            )

        # Delete user
        success = auth.delete_user(user_id)

        if not success:
            return func.HttpResponse(
                body=json.dumps({"error": "User not found"}),
                mimetype="application/json",
                status_code=404
            )

        logging.info(f'User deleted: {user_id}')
        return func.HttpResponse(
            body=json.dumps({"message": "User deleted successfully"}),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:
        logging.error(f'Delete user error: {str(e)}')
        return func.HttpResponse(
            body=json.dumps({"error": "Failed to delete user"}),
            mimetype="application/json",
            status_code=500
        )


# ============================================================================
# Data Endpoints
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
    product_id_filter = req.params.get('product_id')
    include_2024 = req.params.get('include_2024', 'false').lower() == 'true'  # Default: don't include 2024

    # Build Freshdesk API URL
    base_url = f"https://{domain}.freshdesk.com/api/v2/tickets"

    # Build query parameters for Freshdesk
    # NOTE: Freshdesk /api/v2/tickets doesn't support created_at filtering directly
    # We'll fetch tickets and filter by created_at on the server side
    params = {}

    # Determine date range for fetching
    # If include_2024 is true, fetch from Jan 1, 2024; otherwise fetch recent tickets only
    if include_2024:
        # Fetch all tickets since Jan 1, 2024 to capture historical data
        params['updated_since'] = '2024-01-01T00:00:00Z'
        logging.info("📅 Including 2024 tickets - fetching since Jan 1, 2024")
    elif start_date:
        # Use updated_since as a broad filter, then filter by created_at more precisely below
        params['updated_since'] = start_date
        logging.info(f"📅 Current year only - fetching since {start_date}")

    try:
        # Check cache first with appropriate TTL
        cache_key = get_cache_key(base_url, params, include_historical=include_2024)
        cache_ttl = CACHE_TTL_HISTORICAL if include_2024 else CACHE_TTL_CURRENT
        cached_data = get_from_cache(cache_key, ttl=cache_ttl)

        if cached_data is not None:
            tickets_data = cached_data
            logging.info(f"Using {len(tickets_data)} cached tickets (include_2024={include_2024}, TTL={cache_ttl}s)")
        else:
            # Fetch all pages from Freshdesk with pagination
            # Increased max_pages to capture more tickets since we're filtering by created_at, not updated_at
            logging.info(f"Fetching tickets from Freshdesk with pagination: {base_url}")
            tickets_data = fetch_all_pages_from_freshdesk(base_url, headers, params, max_pages=50)
            logging.info(f"Fetched total of {len(tickets_data)} tickets from Freshdesk")

            # Cache the results
            set_in_cache(cache_key, tickets_data)

        # Process each ticket
        processed_tickets = [process_ticket(ticket, domain) for ticket in tickets_data]

        # Apply client-side filters
        filtered_tickets = processed_tickets

        # Filter by year first - exclude 2024 tickets unless explicitly requested
        from datetime import datetime
        if not include_2024:
            try:
                original_count = len(filtered_tickets)
                filtered_tickets = [
                    t for t in filtered_tickets
                    if t.get('created_at') and datetime.fromisoformat(t['created_at'].replace('Z', '+00:00')).year >= 2025
                ]
                excluded_2024 = original_count - len(filtered_tickets)
                logging.info(f"🚫 Excluded {excluded_2024} tickets from 2024 (include_2024=false)")
                logging.info(f"Filtered to {len(filtered_tickets)} tickets from 2025+")
            except Exception as e:
                logging.warning(f"Could not filter by year: {e}")

        # Filter by created_at date range (most important - filter by creation, not update)
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                filtered_tickets = [
                    t for t in filtered_tickets
                    if t.get('created_at') and datetime.fromisoformat(t['created_at'].replace('Z', '+00:00')) >= start_dt
                ]
                logging.info(f"Filtered to {len(filtered_tickets)} tickets created after {start_date}")
            except Exception as e:
                logging.warning(f"Could not parse start_date for filtering: {e}")

        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                filtered_tickets = [
                    t for t in filtered_tickets
                    if t.get('created_at') and datetime.fromisoformat(t['created_at'].replace('Z', '+00:00')) <= end_dt
                ]
                logging.info(f"Filtered to {len(filtered_tickets)} tickets created before {end_date}")
            except Exception as e:
                logging.warning(f"Could not parse end_date for filtering: {e}")

        if product_id_filter:
            filtered_tickets = [t for t in filtered_tickets if str(t.get('product_id')) == product_id_filter]
            logging.info(f"Filtered to {len(filtered_tickets)} tickets for product_id {product_id_filter}")

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
        # Fetch ticket details (include stats for timeline data)
        ticket_url = f"https://{domain}.freshdesk.com/api/v2/tickets/{ticket_id}"
        params = {'include': 'stats'}
        logging.info(f"Fetching ticket with stats: {ticket_url}")
        ticket_response = requests.get(ticket_url, headers=headers, params=params, timeout=30)
        ticket_response.raise_for_status()
        ticket_data = ticket_response.json()

        # Process ticket
        processed_ticket = process_ticket(ticket_data, domain)

        # Fetch requester information if requester_id exists
        requester_data = None
        requester_id = ticket_data.get('requester_id')
        if requester_id:
            try:
                requester_url = f"https://{domain}.freshdesk.com/api/v2/contacts/{requester_id}"
                logging.info(f"Fetching requester: {requester_url}")
                requester_response = requests.get(requester_url, headers=headers, timeout=30)
                requester_response.raise_for_status()
                requester_data = requester_response.json()
                logging.info(f"✅ Fetched requester: {requester_data.get('name', 'Unknown')}")
            except Exception as e:
                logging.warning(f"Could not fetch requester details: {str(e)}")
                requester_data = None

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
            "requester": requester_data,
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
    product_id_filter = req.params.get('product_id')
    include_2024 = req.params.get('include_2024', 'false').lower() == 'true'

    # Build Freshdesk API URL
    base_url = f"https://{domain}.freshdesk.com/api/v2/tickets"

    params = {'include': 'stats'}  # Include stats for agent_responded count

    # Determine date range for fetching
    if include_2024:
        params['updated_since'] = '2024-01-01T00:00:00Z'
        logging.info("📅 Summary: Including 2024 tickets - fetching since Jan 1, 2024")
    elif start_date:
        params['updated_since'] = start_date
        logging.info(f"📅 Summary: Current year only - fetching since {start_date}")

    try:
        # Check cache first with appropriate TTL
        cache_key = get_cache_key(base_url, params, include_historical=include_2024)
        cache_ttl = CACHE_TTL_HISTORICAL if include_2024 else CACHE_TTL_CURRENT
        cached_data = get_from_cache(cache_key, ttl=cache_ttl)

        if cached_data is not None:
            tickets_data = cached_data
            logging.info(f"Using {len(tickets_data)} cached tickets for summary (include_2024={include_2024})")
        else:
            # Fetch all pages from Freshdesk with pagination
            logging.info(f"Fetching tickets for summary with pagination (including stats): {base_url}")
            tickets_data = fetch_all_pages_from_freshdesk(base_url, headers, params, max_pages=50)
            logging.info(f"Fetched total of {len(tickets_data)} tickets for summary")

            # Cache the results
            set_in_cache(cache_key, tickets_data)

        logging.info(f"Processing {len(tickets_data)} tickets for summary")

        # Apply product_id filter if specified
        if product_id_filter:
            tickets_data = [t for t in tickets_data if str(t.get('product_id')) == product_id_filter]
            logging.info(f"Filtered to {len(tickets_data)} tickets for product_id {product_id_filter}")

        # Filter by year - exclude 2024 tickets unless explicitly requested
        from datetime import datetime
        if not include_2024:
            try:
                original_count = len(tickets_data)
                tickets_data = [
                    t for t in tickets_data
                    if t.get('created_at') and datetime.fromisoformat(t['created_at'].replace('Z', '+00:00')).year >= 2025
                ]
                excluded_2024 = original_count - len(tickets_data)
                logging.info(f"🚫 Summary: Excluded {excluded_2024} tickets from 2024")
                logging.info(f"Summary: Processing {len(tickets_data)} tickets from 2025+")
            except Exception as e:
                logging.warning(f"Could not filter summary by year: {e}")

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
# Azure DevOps Work Items Endpoints
# ============================================================================

@app.route(route="devops/{id}", auth_level=func.AuthLevel.ANONYMOUS)
def get_devops_item(req: func.HttpRequest) -> func.HttpResponse:
    """
    Fetch a single Azure DevOps work item by ID
    Returns: Full work item details including all fields
    """
    logging.info("Fetching single Azure DevOps work item")

    # Get work item ID from route parameter
    work_item_id = req.route_params.get('id')

    if not work_item_id:
        return func.HttpResponse(
            body=json.dumps({"error": "Work item ID is required"}),
            mimetype="application/json",
            status_code=400
        )

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

        # Get work item details
        work_item_url = f"{base_url}/wit/workitems/{work_item_id}?api-version=7.2-preview.3"
        logging.info(f"Fetching work item: {work_item_url}")

        response = requests.get(
            work_item_url,
            auth=auth,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        work_item = response.json()

        # Process and format the work item
        fields = work_item.get('fields', {})

        # Extract Freshdesk ticket ID from custom field
        freshdesk_link = fields.get('Custom.FreshdeskLink', '')
        freshdesk_ticket_id = freshdesk_link if freshdesk_link else None

        # Extract assigned user (System.AssignedTo is an object with displayName)
        assigned_to_obj = fields.get('System.AssignedTo', {})
        assigned_to = assigned_to_obj.get('displayName', 'Unassigned') if assigned_to_obj else 'Unassigned'

        # Format the response with commonly used fields at root level for easy access
        result = {
            'id': work_item.get('id'),
            'title': fields.get('System.Title', 'Untitled'),
            'work_item_type': fields.get('System.WorkItemType', 'Unknown'),
            'state': fields.get('System.State', 'Unknown'),
            'created_date': fields.get('System.CreatedDate'),
            'changed_date': fields.get('System.ChangedDate'),
            'area_path': fields.get('System.AreaPath'),
            'iteration_path': fields.get('System.IterationPath'),
            'tags': fields.get('System.Tags', ''),
            'priority': fields.get('Microsoft.VSTS.Common.Priority'),
            'description': fields.get('System.Description'),
            'freshdesk_ticket_id': freshdesk_ticket_id,
            'assigned_to': assigned_to,
            'url': work_item.get('_links', {}).get('html', {}).get('href', f"https://dev.azure.com/{org}/{project}/_workitems/edit/{work_item_id}"),
            # Include all fields for flexibility
            'fields': fields,
            '_links': work_item.get('_links', {})
        }

        # Extract custom Freshdesk link in a nested structure if available
        if freshdesk_link:
            result['custom'] = {'freshdesklink': freshdesk_link}

        logging.info(f"Successfully fetched work item {work_item_id}")

        return func.HttpResponse(
            body=json.dumps({
                "success": True,
                "workItem": result
            }),
            mimetype="application/json",
            status_code=200
        )

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            logging.warning(f"Work item not found: {work_item_id}")
            return func.HttpResponse(
                body=json.dumps({"error": "Work item not found"}),
                mimetype="application/json",
                status_code=404
            )
        logging.error(f"HTTP error fetching work item: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": f"Failed to fetch work item: {str(e)}"}),
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
    except Exception as e:
        logging.error(f"Unexpected error fetching work item: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": f"Unexpected error: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )


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

# ============================================================================
# AI Insights Generation Endpoint
# ============================================================================

@app.route(route="generate_insights", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def generate_insights(req: func.HttpRequest) -> func.HttpResponse:
    """Generate AI-powered insights from aggregated ticket data using Claude"""
    logging.info('Generate insights function triggered')

    try:
        # Import Anthropic SDK
        from anthropic import Anthropic

        # Get request body
        req_body = req.get_json()

        # Extract data from request
        aggregated_data = req_body.get('aggregated_data')
        focus_area = req_body.get('focus_area', 'summary')  # summary, trends, performance, priority, predictive, full
        date_range = req_body.get('date_range', {})

        if not aggregated_data:
            return func.HttpResponse(
                json.dumps({"error": "aggregated_data is required"}),
                mimetype="application/json",
                status_code=400
            )

        # Get API key from environment
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            return func.HttpResponse(
                json.dumps({"error": "ANTHROPIC_API_KEY not configured"}),
                mimetype="application/json",
                status_code=500
            )

        # Initialize Anthropic client
        client = Anthropic(api_key=api_key)

        # Build system prompt based on focus area
        system_prompt = _get_insights_system_prompt(focus_area)

        # Build user message with aggregated data
        user_message = _build_insights_user_message(aggregated_data, date_range, focus_area)

        # Call Claude API
        logging.info(f'Calling Claude API for focus area: {focus_area}')
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            temperature=0.7,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_message
                }
            ]
        )

        # Extract insights text
        insights_text = message.content[0].text

        # Return response
        return func.HttpResponse(
            json.dumps({
                "insights": insights_text,
                "focus_area": focus_area,
                "date_range": date_range,
                "tokens_used": {
                    "input": message.usage.input_tokens,
                    "output": message.usage.output_tokens
                }
            }),
            mimetype="application/json",
            status_code=200
        )

    except ValueError as e:
        logging.error(f'Invalid request body: {str(e)}')
        return func.HttpResponse(
            json.dumps({"error": "Invalid request body"}),
            mimetype="application/json",
            status_code=400
        )
    except Exception as e:
        logging.error(f'Error generating insights: {str(e)}')
        return func.HttpResponse(
            json.dumps({"error": f"Error generating insights: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )


def _get_insights_system_prompt(focus_area):
    """Get system prompt based on focus area"""

    base_prompt = """You are an executive business analyst specializing in customer support operations.
Your role is to analyze support ticket data and provide clear, actionable insights for C-level executives.

Key guidelines:
- Focus on business impact and strategic implications
- Use clear, concise language appropriate for executives
- Highlight trends, patterns, and anomalies
- Provide specific, actionable recommendations
- Use emojis sparingly to highlight key sections
- Format output in markdown for readability"""

    focus_prompts = {
        'summary': """
Focus on providing a high-level executive summary:
- Overall ticket volume trends
- Key performance indicators
- Most notable insights (2-3 items)
- Immediate action items if any
Keep it brief (3-4 paragraphs).""",

        'trends': """
Focus on identifying trends and patterns:
- Volume trends over time
- Day-of-week patterns
- Platform/league distribution shifts
- Issue type evolution
- Response time trends
Provide forward-looking insights.""",

        'performance': """
Focus on team performance metrics:
- Response time analysis
- Resolution rate assessment
- Workload distribution
- Efficiency opportunities
- Bottleneck identification
Include specific improvement recommendations.""",

        'priority': """
Focus on priority and risk analysis:
- Urgent/High priority ticket trends
- Critical issue identification
- Platform/league risk areas
- Resource allocation recommendations
- Escalation patterns
Highlight areas needing immediate attention.""",

        'predictive': """
Focus on predictive insights and forecasting:
- Projected ticket volumes
- Potential capacity issues
- Seasonal patterns
- Resource planning recommendations
- Proactive measures to consider
Help plan for the future.""",

        'full': """
Provide a comprehensive analysis covering:
1. Executive Summary
2. Volume & Trend Analysis
3. Performance Metrics
4. Priority & Risk Assessment
5. Platform/League Insights
6. Recommendations & Action Items
This should be a detailed report (8-12 paragraphs)."""
    }

    return base_prompt + "\n" + focus_prompts.get(focus_area, focus_prompts['summary'])


def _build_insights_user_message(aggregated_data, date_range, focus_area):
    """Build user message with aggregated data"""

    # Format date range
    date_range_str = f"{date_range.get('start_date', 'N/A')} to {date_range.get('end_date', 'N/A')}"

    # Build message
    message = f"""Analyze the following support ticket data for the period: {date_range_str}

**Aggregated Data:**
```json
{json.dumps(aggregated_data, indent=2)}
```

Please provide insights focused on: **{focus_area}**

Note: All personally identifiable information (PII) has been removed from this data."""

    return message
