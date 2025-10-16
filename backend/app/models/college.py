from ..extensions import db

class College(db.Model):
    __tablename__ = 'college'
    code = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'code': self.code,
            'name': self.name
        }
