from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Initialize extensions here. Other files will import from this file.
db = SQLAlchemy()
migrate = Migrate()
