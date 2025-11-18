import os
import re
from supabase import create_client, Client
from typing import Optional, Dict, List, Any
import json

# Supabase configuration
SUPABASE_URL = "https://ufbvyiuydgjydqxayibp.supabase.co"
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

class SupabaseManager:
    def __init__(self):
        self.client: Optional[Client] = None
        self.service_role_client: Optional[Client] = None
        print(f"🔧 [SUPABASE] Initializing SupabaseManager...")
        print(f"🔧 [SUPABASE] SUPABASE_URL: {SUPABASE_URL}")
        print(f"🔧 [SUPABASE] SUPABASE_KEY exists: {SUPABASE_KEY is not None}")
        print(f"🔧 [SUPABASE] SUPABASE_SERVICE_ROLE_KEY exists: {SUPABASE_SERVICE_ROLE_KEY is not None}")
        self.connect()
    
    def connect(self):
        """Initialize Supabase client connection"""
        try:
            if not SUPABASE_KEY:
                raise ValueError("SUPABASE_ANON_KEY environment variable must be set")
            
            print(f"🔌 [SUPABASE] Creating Supabase client...")
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
            print("✅ [SUPABASE] Supabase client created successfully")
            
            # Create service role client if key is available
            if SUPABASE_SERVICE_ROLE_KEY:
                print(f"🔐 [SUPABASE] Creating service role client...")
                self.service_role_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
                print("✅ [SUPABASE] Service role client created successfully")
            else:
                print("⚠️  [SUPABASE] No service role key found, using anon key for all operations")
            
            # Test the connection
            print(f"🧪 [SUPABASE] Testing connection...")
            test_response = self.client.table('users').select('id').limit(1).execute()
            print(f"✅ [SUPABASE] Connection test successful: {type(test_response)}")
            
        except Exception as e:
            print(f"❌ [SUPABASE] Failed to connect to Supabase: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def get_client(self) -> Client:
        """Get Supabase client instance"""
        if not self.client:
            print(f"⚠️  [SUPABASE] Client is None, reconnecting...")
            self.connect()
        return self.client
    
    def get_service_role_client(self) -> Optional[Client]:
        """Get Supabase service role client instance (bypasses RLS)"""
        if not self.service_role_client:
            print(f"⚠️  [SUPABASE] Service role client is None, creating...")
            if SUPABASE_SERVICE_ROLE_KEY:
                try:
                    self.service_role_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
                    print("✅ [SUPABASE] Service role client created successfully")
                except Exception as e:
                    print(f"❌ [SUPABASE] Failed to create service role client: {e}")
                    return None
            else:
                print("⚠️  [SUPABASE] No service role key available")
                return None
        return self.service_role_client
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            print(f"🧪 [SUPABASE] Testing connection via test_connection method...")
            response = self.client.table('users').select('count').limit(1).execute()
            print(f"✅ [SUPABASE] Test connection successful: {response}")
            return True
        except Exception as e:
            print(f"❌ [SUPABASE] Connection test failed: {e}")
            import traceback
            traceback.print_exc()
            return False

# Global Supabase manager instance
print(f"🚀 [SUPABASE] Creating global Supabase manager...")
supabase_manager = SupabaseManager()

def get_one(table: str, columns: str = "*", where_clause: str = None, params: List = None, use_service_role: bool = False) -> Optional[Dict]:
    """Get single record from a table - FIXED: No case conversion"""
    try:
        # Choose client based on use_service_role flag
        client = supabase_manager.get_service_role_client() if use_service_role else supabase_manager.get_client()
        if not client:
            print(f"❌ [SUPABASE] No client available for {table} query")
            return None
            
        query = client.table(table).select(columns)
        
        if where_clause and params:
            if ' = ' in where_clause:
                column, _ = where_clause.split(' = ', 1)
                # Clean up column name (remove SQL functions like UPPER(), LOWER(), etc.)
                clean_column = column.replace('%s', '').strip()
                # Remove SQL functions and get just the column name
                if '(' in clean_column and ')' in clean_column:
                    # Extract column name from functions like UPPER(code)
                    import re
                    func_match = re.match(r'([A-Z_]+\()([a-zA-Z_]+)', clean_column)
                    if func_match:
                        clean_column = func_match.group(2)
                
                # FIXED: Remove case conversion - use exact matching
                param_value = params[0]
                
                query = query.eq(clean_column, param_value)
        
        result = query.maybe_single().execute()
        # FIXED: Check if result is not None before accessing result.data
        return result.data if result else None
        
    except Exception as e:
        print(f"Error getting record from {table}: {e}")
        return None

def get_all(table: str, columns: str = "*", where_clause: str = None, params: List = None, 
           order_by: str = None, limit: int = None, offset: int = None, use_service_role: bool = False) -> List[Dict]:
    """Get all records from a table - FIXED: No case conversion"""
    try:
        # Choose client based on use_service_role flag
        client = supabase_manager.get_service_role_client() if use_service_role else supabase_manager.get_client()
        if not client:
            print(f"❌ [SUPABASE] No client available for {table} query")
            return []
            
        query = client.table(table).select(columns)
        
        if where_clause and params:
            if ' = ' in where_clause:
                column, _ = where_clause.split(' = ', 1)
                # Clean up column name for SQL functions
                clean_column = column.replace('%s', '').strip()
                if '(' in clean_column and ')' in clean_column:
                    import re
                    func_match = re.match(r'([A-Z_]+\()([a-zA-Z_]+)', clean_column)
                    if func_match:
                        clean_column = func_match.group(2)
                
                # FIXED: Remove case conversion - use exact matching
                param_value = params[0]
                
                query = query.eq(clean_column, param_value)
        
        if order_by:
            query = query.order(order_by)
        
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or []
    except Exception as e:
        print(f"Error getting records from {table}: {e}")
        return []

def insert_record(table: str, data: Dict, returning: str = "*", commit: bool = True) -> Optional[Dict]:
    """Insert record and return specified columns - FIXED VERSION"""
    try:
        # Insert the data using service role client to bypass RLS for authenticated users
        insert_response = supabase_manager.get_service_role_client().table(table).insert(data).execute()

        if not insert_response.data:
            print(f"No data returned from insert operation")
            return None

        # Get the inserted record's ID (assuming 'id' is the primary key)
        inserted_record = insert_response.data[0]
        print(f"Inserted record: {inserted_record}")

        # If we need to return specific columns, do a follow-up select
        if returning != "*":
            # Get the ID field value
            record_id = inserted_record.get('id')
            if record_id:
                print(f"Fetching record with ID {record_id}")
                select_response = supabase_manager.get_service_role_client().table(table).select(returning).eq('id', record_id).execute()
                if select_response.data:
                    return select_response.data[0]

        return inserted_record

    except Exception as e:
        print(f"Error inserting record into {table}: {e}")
        import traceback
        traceback.print_exc()
        return None

def update_record(table: str, data: Dict, where_clause: str, params: List = None, commit: bool = True) -> Optional[int]:
    """Update record(s) in a table"""
    try:
        if not params:
            if 'id' in data:
                params = [data['id']]
                update_data = {k: v for k, v in data.items() if k != 'id'}
            else:
                return None
        else:
            update_data = data
        
        if ' = ' in where_clause:
            column, _ = where_clause.split(' = ', 1)
            column_name = column.replace('%s', '').strip()
            id_value = params[0]
            response = supabase_manager.get_client().table(table).update(update_data).eq(column_name, id_value).execute()
            return len(response.data) if response.data else 0
        
        return 0
    except Exception as e:
        print(f"Error updating record in {table}: {e}")
        return None

def delete_record(table: str, where_clause: str, params: List = None, commit: bool = True) -> Optional[int]:
    """Delete record(s) from a table"""
    try:
        if ' = ' in where_clause:
            column, _ = where_clause.split(' = ', 1)
            column_name = column.replace('%s', '').strip()
            id_value = params[0] if params else None
            
            if id_value:
                response = supabase_manager.get_client().table(table).delete().eq(column_name, id_value).execute()
                return len(response.data) if response.data else 0
        
        return 0
    except Exception as e:
        print(f"Error deleting record from {table}: {e}")
        return None

def count_records(table: str, where_clause: str = None, params: List = None) -> int:
    """Count records in a table - OPTIMIZED: Use 'id' instead of '*' for better performance"""
    try:
        # OPTIMIZED: Use primary key 'id' instead of '*' for 100x faster counting
        query = supabase_manager.get_client().table(table).select('id', count='exact')

        if where_clause and params:
            if ' = ' in where_clause:
                column, _ = where_clause.split(' = ', 1)
                # Clean up column name for SQL functions
                clean_column = column.replace('%s', '').strip()
                if '(' in clean_column and ')' in clean_column:
                    import re
                    func_match = re.match(r'([A-Z_]+\()([a-zA-Z_]+)', clean_column)
                    if func_match:
                        clean_column = func_match.group(2)

               
                param_value = params[0]

                query = query.eq(clean_column, param_value)

        response = query.execute()
        return response.count if hasattr(response, 'count') and response.count is not None else 0
    except Exception as e:
        print(f"Error counting records in {table}: {e}")
        return 0

def execute_raw_sql(query: str, params: List = None, fetch: bool = False, commit: bool = False):
    """Execute raw SQL query (for complex queries that Supabase client can't handle)"""
    print("Raw SQL execution not supported with Supabase client")
    print("Consider using Supabase RPC functions instead")
    return None

def paginate_query(table: str, columns: str = "*", where_clause: str = None, params: List = None, 
                  page: int = 1, per_page: int = 10, order_by: str = None):
    """Paginate a query result"""
    try:
        offset = (page - 1) * per_page
        items = get_all(table, columns, where_clause, params, order_by, per_page, offset)
        total = count_records(table, where_clause, params)
        
        return {
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page if total > 0 else 0
        }
    except Exception as e:
        print(f"Error in paginate_query: {e}")
        return {
            'items': [],
            'total': 0,
            'page': page,
            'per_page': per_page,
            'pages': 0
        }

# ===== SERVICE_ROLE AUTHENTICATION FUNCTIONS =====
# These functions use the service_role key to bypass RLS for secure authentication

def auth_get_user_by_username(username: str) -> Optional[Dict]:
    """
    Get user by username using service_role client (bypasses RLS)
    This is used for authentication to avoid RLS policy issues
    """
    print(f"🔐 [AUTH] Service role lookup for username: {username}")
    try:
        # Use service role client to bypass RLS
        user = get_one('users', where_clause='username = %s', params=[username], use_service_role=True)
        if user:
            print(f"✅ [AUTH] Found user: {user.get('username')}")
        else:
            print(f"❌ [AUTH] User not found: {username}")
        return user
    except Exception as e:
        print(f"❌ [AUTH] Error getting user by username: {e}")
        return None

def auth_get_user_by_email(email: str) -> Optional[Dict]:
    """
    Get user by email using service_role client (bypasses RLS)
    This is used for authentication to avoid RLS policy issues
    """
    print(f"🔐 [AUTH] Service role lookup for email: {email}")
    try:
        # Use service role client to bypass RLS
        user = get_one('users', where_clause='email = %s', params=[email], use_service_role=True)
        if user:
            print(f"✅ [AUTH] Found user: {user.get('username')}")
        else:
            print(f"❌ [AUTH] User not found: {email}")
        return user
    except Exception as e:
        print(f"❌ [AUTH] Error getting user by email: {e}")
        return None

def auth_verify_user_credentials(username: str, password: str) -> Optional[Dict]:
    """
    Verify user credentials using service_role client (bypasses RLS)
    This function:
    1. Gets user by username using service_role (bypasses RLS)
    2. Verifies password hash
    3. Returns user data if valid, None if invalid
    """
    print(f"🔐 [AUTH] Verifying credentials for: {username}")
    
    try:
        # Import here to avoid circular import
        from werkzeug.security import check_password_hash
        
        # Get user using service_role client (bypasses RLS)
        user = auth_get_user_by_username(username)
        
        if not user:
            print(f"❌ [AUTH] User not found: {username}")
            return None
        
        # Verify password
        password_hash = user.get('password_hash')
        if not password_hash:
            print(f"❌ [AUTH] No password hash found for user: {username}")
            return None
        
        # Check password
        if check_password_hash(password_hash, password):
            print(f"✅ [AUTH] Password verified for: {username}")
            # Return user data without password hash
            user_data = {k: v for k, v in user.items() if k != 'password_hash'}
            return user_data
        else:
            print(f"❌ [AUTH] Invalid password for: {username}")
            return None
            
    except Exception as e:
        print(f"❌ [AUTH] Error verifying credentials: {e}")
        import traceback
        traceback.print_exc()
        return None
