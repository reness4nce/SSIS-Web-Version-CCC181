from werkzeug.security import generate_password_hash, check_password_hash
from ..supabase import supabase_manager, get_one, insert_record, update_record, delete_record, execute_raw_sql

class User:
    """User model using Supabase operations"""

    @staticmethod
    def create_table():
        """Create users table if it doesn't exist"""
        create_table_query = """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(80) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(256) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        execute_raw_sql(create_table_query, commit=True)

    @staticmethod
    def get_by_username(username):
        """Get user by username"""
        return get_one("users", where_clause="username = %s", params=[username])

    @staticmethod
    def get_by_email(email):
        """Get user by email"""
        return get_one("users", where_clause="email = %s", params=[email])

    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        return get_one("users", where_clause="id = %s", params=[user_id])

    @staticmethod
    def create_user(username, email, password):
        """Create a new user"""
        password_hash = generate_password_hash(password)
        user_data = {
            'username': username,
            'email': email,
            'password_hash': password_hash
        }
        return insert_record("users", user_data, returning="*")

    @staticmethod
    def update_user(user_id, username=None, email=None, password=None):
        """Update user information"""
        update_data = {}
        if username:
            update_data['username'] = username
        if email:
            update_data['email'] = email
        if password:
            update_data['password_hash'] = generate_password_hash(password)

        if not update_data:
            return None

        return update_record(
            "users",
            update_data,
            "id = %s",
            params={**update_data, 'id': user_id}
        )

    @staticmethod
    def delete_user(user_id):
        """Delete a user"""
        return delete_record("users", "id = %s", params=[user_id])

    @staticmethod
    def verify_password(password_hash, password):
        """Verify password against hash"""
        return check_password_hash(password_hash, password)

    @staticmethod
    def get_all_users():
        """Get all users"""
        # For now, fallback to direct Supabase query since execute_raw_sql is limited
        try:
            result = supabase_manager.get_client().table('users').select('id, username, email, created_at').order('username').execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting users: {e}")
            return []

    def __init__(self, username, email, password_hash=None, user_id=None):
        """Initialize User object"""
        self.id = user_id
        self.username = username
        self.email = email
        self.password_hash = password_hash

    def set_password(self, password):
        """Set password hash"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check password against stored hash"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def save(self):
        """Save user to database"""
        if self.id:
            # Update existing user
            return User.update_user(self.id, self.username, self.email)
        else:
            # Create new user
            result = User.create_user(self.username, self.email, "")
            if result:
                self.id = result['id']
                self.password_hash = result['password_hash']
                return True
            return False

    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email
        }

    def __repr__(self):
        return f'<User {self.username}>'
