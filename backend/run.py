import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import the app factory from the app module
from app import create_app

# --- Create App instance for running with a WSGI server ---
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
