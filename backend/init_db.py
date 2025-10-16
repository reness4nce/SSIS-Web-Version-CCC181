#!/usr/bin/env python3
"""
Database initialization script for SSIS Web Version
"""

import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from run import create_app, db
from seed_data import seed_database

def init_database():
    """Initialize database tables and seed with data"""
    app = create_app()

    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("✅ Database tables created successfully!")

        print("Seeding database with sample data...")
        seed_database()
        print("✅ Database seeded successfully!")

if __name__ == "__main__":
    init_database()
