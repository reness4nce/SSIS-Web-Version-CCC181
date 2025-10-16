from werkzeug.security import generate_password_hash, check_password_hash
# Corrected import for the new flat structure
from ..extensions import db

# The UserMixin is removed as we are using a custom session-based auth
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False) 
    password_hash = db.Column(db.String(256), nullable=False)

    def set_password(self, password):
        """Creates a hashed password from a plain text password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Checks if a plain text password matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'
