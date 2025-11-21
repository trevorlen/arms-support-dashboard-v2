"""
Authentication utilities for JWT token management and user operations.
"""
import json
import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, List

# Constants
USERS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'users.json')
JWT_ALGORITHM = 'HS256'
TOKEN_EXPIRY_HOURS = 24


def get_jwt_secret() -> str:
    """Get JWT secret key from environment variables."""
    secret = os.environ.get('JWT_SECRET_KEY')
    if not secret:
        raise ValueError("JWT_SECRET_KEY environment variable not set")
    return secret


def generate_token(user_data: Dict) -> str:
    """
    Generate JWT token from user data.

    Args:
        user_data: Dictionary containing user information (id, username, role)

    Returns:
        JWT token string
    """
    payload = {
        'user_id': user_data['id'],
        'username': user_data['username'],
        'role': user_data['role'],
        'exp': datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
        'iat': datetime.utcnow()
    }

    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[Dict]:
    """
    Verify and decode JWT token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def hash_password(password: str) -> str:
    """
    Hash password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify password against hash.

    Args:
        password: Plain text password
        password_hash: Hashed password

    Returns:
        True if password matches, False otherwise
    """
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def load_users() -> List[Dict]:
    """
    Load users from JSON file.

    Returns:
        List of user dictionaries
    """
    if not os.path.exists(USERS_FILE):
        return []

    with open(USERS_FILE, 'r') as f:
        return json.load(f)


def save_users(users: List[Dict]) -> None:
    """
    Save users to JSON file.

    Args:
        users: List of user dictionaries
    """
    # Ensure directory exists
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)

    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)


def get_user_by_username(username: str) -> Optional[Dict]:
    """
    Find user by username.

    Args:
        username: Username to search for

    Returns:
        User dictionary if found, None otherwise
    """
    users = load_users()
    for user in users:
        if user['username'] == username:
            return user
    return None


def get_user_by_id(user_id: str) -> Optional[Dict]:
    """
    Find user by ID.

    Args:
        user_id: User ID to search for

    Returns:
        User dictionary if found, None otherwise
    """
    users = load_users()
    for user in users:
        if user['id'] == user_id:
            return user
    return None


def create_user(username: str, password: str, full_name: str, role: str) -> Dict:
    """
    Create a new user.

    Args:
        username: Username
        password: Plain text password
        full_name: User's full name
        role: User role (Admin, Manager, Viewer)

    Returns:
        Created user dictionary (without password_hash)

    Raises:
        ValueError: If username already exists or role is invalid
    """
    # Validate role
    valid_roles = ['Admin', 'Manager', 'Viewer']
    if role not in valid_roles:
        raise ValueError(f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    # Check if username exists
    if get_user_by_username(username):
        raise ValueError(f"Username '{username}' already exists")

    # Load existing users
    users = load_users()

    # Generate new ID
    max_id = 0
    for user in users:
        try:
            user_id = int(user['id'])
            if user_id > max_id:
                max_id = user_id
        except (ValueError, KeyError):
            pass

    new_id = str(max_id + 1)

    # Create user
    new_user = {
        'id': new_id,
        'username': username,
        'password_hash': hash_password(password),
        'full_name': full_name,
        'role': role,
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'must_change_password': True,  # New users must change password on first login
        'last_login': None  # Track last login timestamp
    }

    # Add to users list
    users.append(new_user)
    save_users(users)

    # Return user without password_hash
    return {
        'id': new_user['id'],
        'username': new_user['username'],
        'full_name': new_user['full_name'],
        'role': new_user['role'],
        'created_at': new_user['created_at']
    }


def update_user(user_id: str, updates: Dict) -> Optional[Dict]:
    """
    Update user information.

    Args:
        user_id: User ID to update
        updates: Dictionary of fields to update (username, full_name, role, password)

    Returns:
        Updated user dictionary (without password_hash) if successful, None if user not found

    Raises:
        ValueError: If trying to update to invalid role or duplicate username
    """
    users = load_users()
    user_index = None

    # Find user
    for i, user in enumerate(users):
        if user['id'] == user_id:
            user_index = i
            break

    if user_index is None:
        return None

    # Validate role if being updated
    if 'role' in updates:
        valid_roles = ['Admin', 'Manager', 'Viewer']
        if updates['role'] not in valid_roles:
            raise ValueError(f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    # Check for duplicate username if being updated
    if 'username' in updates and updates['username'] != users[user_index]['username']:
        if get_user_by_username(updates['username']):
            raise ValueError(f"Username '{updates['username']}' already exists")

    # Update fields
    if 'username' in updates:
        users[user_index]['username'] = updates['username']
    if 'full_name' in updates:
        users[user_index]['full_name'] = updates['full_name']
    if 'role' in updates:
        users[user_index]['role'] = updates['role']
    if 'password' in updates:
        users[user_index]['password_hash'] = hash_password(updates['password'])
        users[user_index]['must_change_password'] = False  # Clear flag after password change
    if 'must_change_password' in updates:
        users[user_index]['must_change_password'] = updates['must_change_password']

    # Save users
    save_users(users)

    # Return updated user without password_hash
    updated_user = users[user_index]
    return {
        'id': updated_user['id'],
        'username': updated_user['username'],
        'full_name': updated_user['full_name'],
        'role': updated_user['role'],
        'created_at': updated_user['created_at']
    }


def delete_user(user_id: str) -> bool:
    """
    Delete a user.

    Args:
        user_id: User ID to delete

    Returns:
        True if user was deleted, False if user not found
    """
    users = load_users()
    initial_count = len(users)

    # Filter out user
    users = [user for user in users if user['id'] != user_id]

    if len(users) < initial_count:
        save_users(users)
        return True

    return False


def update_last_login(user_id: str) -> bool:
    """
    Update user's last login timestamp.

    Args:
        user_id: User ID to update

    Returns:
        True if user was updated, False if user not found
    """
    users = load_users()

    for user in users:
        if user['id'] == user_id:
            user['last_login'] = datetime.utcnow().isoformat() + 'Z'
            save_users(users)
            return True

    return False


def get_all_users() -> List[Dict]:
    """
    Get all users (without password hashes).

    Returns:
        List of user dictionaries without password_hash field
    """
    users = load_users()
    return [
        {
            'id': user['id'],
            'username': user['username'],
            'full_name': user['full_name'],
            'role': user['role'],
            'created_at': user['created_at'],
            'last_login': user.get('last_login'),
            'must_change_password': user.get('must_change_password', False)
        }
        for user in users
    ]
