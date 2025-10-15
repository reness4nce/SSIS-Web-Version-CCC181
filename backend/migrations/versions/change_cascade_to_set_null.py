"""Change cascade to set null

Revision ID: change_cascade_to_set_null
Revises: 042c9eabbcdb
Create Date: 2025-10-18 14:11:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'change_cascade_to_set_null'
down_revision = '042c9eabbcdb'
branch_labels = None
depends_on = None


def upgrade():
    # First, we need to modify the foreign key constraints to use SET NULL instead of CASCADE
    # We'll need to drop the existing constraints and recreate them

    # Drop existing foreign key constraint for program.college
    op.drop_constraint('program_college_fkey', 'program', type_='foreignkey')

    # Drop existing foreign key constraint for student.course
    op.drop_constraint('student_course_fkey', 'student', type_='foreignkey')

    # Modify columns to allow NULL values
    op.alter_column('program', 'college', nullable=True)
    op.alter_column('student', 'course', nullable=True)

    # Recreate foreign key constraints with SET NULL
    op.create_foreign_key(
        'program_college_fkey',
        'program', 'college',
        ['college'], ['code'],
        onupdate='CASCADE',
        ondelete='SET NULL'
    )

    op.create_foreign_key(
        'student_course_fkey',
        'student', 'program',
        ['course'], ['code'],
        onupdate='CASCADE',
        ondelete='SET NULL'
    )


def downgrade():
    # Reverse the changes - go back to CASCADE

    # Drop the SET NULL constraints
    op.drop_constraint('program_college_fkey', 'program', type_='foreignkey')
    op.drop_constraint('student_course_fkey', 'student', type_='foreignkey')

    # Modify columns to not allow NULL values (back to original)
    op.alter_column('program', 'college', nullable=False)
    op.alter_column('student', 'course', nullable=False)

    # Recreate foreign key constraints with CASCADE
    op.create_foreign_key(
        'program_college_fkey',
        'program', 'college',
        ['college'], ['code'],
        onupdate='CASCADE',
        ondelete='CASCADE'
    )

    op.create_foreign_key(
        'student_course_fkey',
        'student', 'program',
        ['course'], ['code'],
        onupdate='CASCADE',
        ondelete='CASCADE'
    )
