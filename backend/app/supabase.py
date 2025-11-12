"""
Supabase integration for database operations
Replaces the custom PostgreSQL connection with Supabase client
"""
import os
from supabase import create_client, Client
from typing import Optional, Dict, List, Any
import json

# Supabase configuration
SUPABASE_URL = "https://ufbvyiuydgjydqxayibp.supabase.co"
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', 'ysb_secret_dHNoRDArUGvwsJbQsn3iRQ_RXfwKIcO')

class SupabaseManager:
    def __init__(self):
        self.client: Optional[Client] = None
        self.connect()
    
    def connect(self):
        """Initialize Supabase client connection"""
        try:
            if not SUPABASE_KEY or SUPABASE_KEY == 'ysb_secret_dHNoRDArUGvwsJbQsn3iRQ_RXfwKIcO':
                raise ValueError("SUPABASE_ANON_KEY environment variable must be set")
            
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
            print("✅ Supabase client connected successfully")
        except Exception as e:
            print(f"❌ Failed to connect to Supabase: {e}")
            raise
    
    def get_client(self) -> Client:
        """Get Supabase client instance"""
        if not self.client:
            self.connect()
        return self.client
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            response = self.client.table('users').select('count').limit(1).execute()
            return True
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False

# Global Supabase manager instance
supabase_manager = SupabaseManager()

# Helper functions for CRUD operations (matching original database.py interface)
def get_one(table: str, columns: str = "*", where_clause: str = None, params: List = None) -> Optional[Dict]:
    """Get single record from a table"""
    try:
        query = supabase_manager.get_client().table(table).select(columns)
        
        # Apply where conditions
        if where_clause and params:
            # Simple where clause parsing (can be enhanced for complex queries)
            if ' = ' in where_clause:
                column, _ = where_clause.split(' = ', 1)
                query = query.eq(column.replace('%s', '').strip(), params[0])
        
        result = query.maybe_single().execute()
        return result.data if result.data else None
    except Exception as e:
        print(f"Error getting record from {table}: {e}")
        return None

def get_all(table: str, columns: str = "*", where_clause: str = None, params: List = None, 
           order_by: str = None, limit: int = None, offset: int = None) -> List[Dict]:
    """Get all records from a table"""
    try:
        query = supabase_manager.get_client().table(table).select(columns)
        
        # Apply where conditions
        if where_clause and params:
            if ' = ' in where_clause:
                column, _ = where_clause.split(' = ', 1)
                query = query.eq(column.replace('%s', '').strip(), params[0])
        
        # Apply ordering
        if order_by:
            query = query.order(order_by)
        
        # Apply pagination
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
    """Insert record and return specified columns"""
    try:
        response = supabase_manager.get_client().table(table).insert(data).select(returning).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error inserting record into {table}: {e}")
        return None

def update_record(table: str, data: Dict, where_clause: str, params: List = None, commit: bool = True) -> Optional[int]:
    """Update record(s) in a table"""
    try:
        if not params:
            # Extract ID from data if no params provided
            if 'id' in data:
                params = [data['id']]
                # Remove id from data for update
                update_data = {k: v for k, v in data.items() if k != 'id'}
            else:
                return None
        else:
            update_data = data
        
        # Simple where clause parsing
        if ' = ' in where_clause:
            column, _ = where_clause.split(' = ', 1)
            column_name = column.replace('%s', '').strip()
            
            # For now, assume first param is the ID value
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
    """Count records in a table"""
    try:
        query = supabase_manager.get_client().table(table).select('*', count='exact')
        
        # Apply where conditions
        if where_clause and params:
            if ' = ' in where_clause:
                column, _ = where_clause.split(' = ', 1)
                query = query.eq(column.replace('%s', '').strip(), params[0])
        
        response = query.execute()
        return response.count if hasattr(response, 'count') and response.count is not None else 0
    except Exception as e:
        print(f"Error counting records in {table}: {e}")
        return 0

def execute_raw_sql(query: str, params: List = None, fetch: bool = False, commit: bool = False):
    """Execute raw SQL query (for complex queries that Supabase client can't handle)"""
    # Note: Supabase doesn't support direct SQL execution from client
    # This would need to be implemented via Supabase Functions or RPC
    # For now, we'll return an error message
    print("Raw SQL execution not supported with Supabase client")
    print("Consider using Supabase RPC functions instead")
    return None

# Specialized query helpers for complex operations
def paginate_query(table: str, columns: str = "*", where_clause: str = None, params: List = None, 
                  page: int = 1, per_page: int = 10, order_by: str = None):
    """Paginate a query result"""
    try:
        # Calculate offset
        offset = (page - 1) * per_page
        
        # Get paginated results
        items = get_all(table, columns, where_clause, params, order_by, per_page, offset)
        
        # Get total count
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
