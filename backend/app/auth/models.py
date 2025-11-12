from werkzeug.security import generate_password_hash, check_password_hash
from ..supabase import supabase_manager, get_one, insert_record, update_record, delete_record, execute_raw_sql

class User:
    """User model for authentication using Supabase"""

    @staticmethod
    def create_table():
        query = """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(80) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE NOT NULL,
            password_hash VARCHAR(256) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        execute_raw_sql(query, commit=True)

    @staticmethod
    def get_by_username(username):
        # Use service_role client to bypass RLS for authentication
        return get_one("users", where_clause="username = %s", params=[username], use_service_role=True)

    @staticmethod
    def get_by_email(email):
        # Use service_role client to bypass RLS for authentication
        return get_one("users", where_clause="email = %s", params=[email], use_service_role=True)

    @staticmethod
    def get_by_id(user_id):
        return get_one("users", where_clause="id = %s", params=[user_id])

    @staticmethod
    def create_user(username, email, password):
        password_hash = generate_password_hash(password)
        user_data = {'username': username, 'email': email, 'password_hash': password_hash}
        return insert_record("users", user_data, returning="*")

    @staticmethod
    def update_user(user_id, username=None, email=None, password=None):
        update_data = {}
        if username:
            update_data['username'] = username
        if email:
            update_data['email'] = email
        if password:
            update_data['password_hash'] = generate_password_hash(password)
        if not update_data:
            return None
        return update_record("users", update_data, "id = %s", params={**update_data, 'id': user_id})

    @staticmethod
    def delete_user(user_id):
        return delete_record("users", "id = %s", params=[user_id])

    @staticmethod
    def verify_password(password_hash, password):
        return check_password_hash(password_hash, password)
