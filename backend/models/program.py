from extensions import db

class Program(db.Model):
    __tablename__ = 'program'
    code = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    college = db.Column(db.String(20), db.ForeignKey('college.code'), nullable=False)

    def to_dict(self):
        return {
            'code': self.code,
            'name': self.name,
            'college': self.college
        }
