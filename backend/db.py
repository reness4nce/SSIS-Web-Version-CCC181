"""
Database helper module for raw SQL operations with PostgreSQL
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from contextlib import contextmanager
import logging

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://sisuser:password123@localhost:5432/sis_db')

# Convert SQLAlchemy format to psycopg2 format if needed
if DATABASE_URL.startswith('postgresql+psycopg2://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql+psycopg2://', 'postgresql://', 1)

class DatabaseManager:
    def __init__(self):
        self.connection = None

    def get_connection(self):
        """Get database connection"""
        if self.connection is None or self.connection.closed:
            self.connection = psycopg2.connect(DATABASE_URL)
        return self.connection

    def close_connection(self):
        """Close database connection"""
        if self.connection and not self.connection.closed:
            self.connection.close()
            self.connection = None

    @contextmanager
    def get_cursor(self, commit=False):
        """Context manager for database cursor"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cursor
            if commit:
                conn.commit()
        except Exception as e:
            if commit:
                conn.rollback()
            logging.error(f"Database error: {e}")
            raise
        finally:
            cursor.close()

    def execute_query(self, query, params=None, fetch=False, commit=False):
        """Execute a query and optionally return results"""
        with self.get_cursor(commit=commit) as cursor:
            cursor.execute(query, params or [])
            if fetch:
                return cursor.fetchall()
            return cursor.rowcount

    def execute_single(self, query, params=None, commit=False):
        """Execute query and return single result"""
        with self.get_cursor(commit=commit) as cursor:
            cursor.execute(query, params or [])
            return cursor.fetchone()

# Global database manager instance
db_manager = DatabaseManager()

# Helper functions for common operations
def get_all(table_name, columns="*", where_clause=None, params=None, order_by=None, limit=None, offset=None):
    """Get all records from a table"""
    query = f"SELECT {columns} FROM {table_name}"
    if where_clause:
        query += f" WHERE {where_clause}"
    if order_by:
        query += f" ORDER BY {order_by}"
    if limit:
        query += f" LIMIT {limit}"
        if offset:
            query += f" OFFSET {offset}"

    return db_manager.execute_query(query, params, fetch=True)

def get_one(table_name, columns="*", where_clause=None, params=None):
    """Get single record from a table"""
    query = f"SELECT {columns} FROM {table_name}"
    if where_clause:
        query += f" WHERE {where_clause}"

    return db_manager.execute_single(query, params)

def insert_record(table_name, data, returning="*", commit=True):
    """Insert record and return specified columns"""
    columns = ", ".join(data.keys())
    placeholders = ", ".join([f"%({key})s" for key in data.keys()])
    query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"

    if returning:
        query += f" RETURNING {returning}"

    with db_manager.get_cursor(commit=commit) as cursor:
        cursor.execute(query, data)
        if returning:
            return cursor.fetchone()
        return cursor.rowcount

def update_record(table_name, data, where_clause, params=None, commit=True):
    """Update record(s) in a table"""
    set_clause = ", ".join([f"{key} = %({key})s" for key in data.keys()])
    query = f"UPDATE {table_name} SET {set_clause} WHERE {where_clause}"

    all_params = {**data, **(params or {})}

    with db_manager.get_cursor(commit=commit) as cursor:
        cursor.execute(query, all_params)
        return cursor.rowcount

def delete_record(table_name, where_clause, params=None, commit=True):
    """Delete record(s) from a table"""
    query = f"DELETE FROM {table_name} WHERE {where_clause}"

    with db_manager.get_cursor(commit=commit) as cursor:
        cursor.execute(query, params or [])
        return cursor.rowcount

def count_records(table_name, where_clause=None, params=None):
    """Count records in a table"""
    query = f"SELECT COUNT(*) as count FROM {table_name}"
    if where_clause:
        query += f" WHERE {where_clause}"

    result = db_manager.execute_single(query, params)
    return result['count'] if result else 0

def execute_raw_sql(query, params=None, fetch=False, commit=False):
    """Execute raw SQL query"""
    return db_manager.execute_query(query, params, fetch=fetch, commit=commit)

# Pagination helper
def paginate_query(query, params=None, page=1, per_page=10, count_query=None):
    """Paginate a query result"""
    # Get total count
    if count_query:
        total = db_manager.execute_single(count_query, params)
        total = total['count'] if total else 0
    else:
        # Extract count from main query (simplified approach)
        total = 0  # This would need more sophisticated parsing

    # Add pagination to query
    offset = (page - 1) * per_page
    paginated_query = f"{query} LIMIT {per_page} OFFSET {offset}"

    results = db_manager.execute_query(paginated_query, params, fetch=True)

    return {
        'items': results,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page if total > 0 else 0
    }

# Transaction management
def transaction():
    """Context manager for database transactions"""
    return db_manager.get_cursor(commit=True)

# Cleanup on exit
import atexit
atexit.register(db_manager.close_connection)
