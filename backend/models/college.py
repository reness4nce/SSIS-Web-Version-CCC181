from extensions import db

class College(db.Model):
    __tablename__ = 'colleges'
    code = db.Column(db.String, primary_key=True)
    name = db.Column(db.String, nullable=False)
    # ...other fields if needed...
