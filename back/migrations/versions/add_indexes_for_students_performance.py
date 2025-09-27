"""add_indexes_for_students_performance

Revision ID: add_indexes_for_students_performance
Revises: add_indexes_for_logs_performance
Create Date: 2024-01-01 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_indexes_for_students_performance'
down_revision = 'add_indexes_for_logs_performance'
branch_labels = None
depends_on = None


def upgrade():
    # Add indexes for Student table to improve query performance
    op.create_index('idx_students_school_id', 'students', ['school_id'])
    op.create_index('idx_students_fullname', 'students', ['fullName'])
    op.create_index('idx_students_school_fullname', 'students', ['school_id', 'fullName'])
    
    # Add indexes for student_classes junction table
    op.create_index('idx_student_classes_student_id', 'student_classes', ['student_id'])
    op.create_index('idx_student_classes_class_id', 'student_classes', ['class_id'])
    
    # Add indexes for Class table
    op.create_index('idx_classes_school_id', 'classes', ['school_id'])
    op.create_index('idx_classes_name', 'classes', ['name'])


def downgrade():
    # Drop indexes in reverse order
    op.drop_index('idx_classes_name', table_name='classes')
    op.drop_index('idx_classes_school_id', table_name='classes')
    op.drop_index('idx_student_classes_class_id', table_name='student_classes')
    op.drop_index('idx_student_classes_student_id', table_name='student_classes')
    op.drop_index('idx_students_school_fullname', table_name='students')
    op.drop_index('idx_students_fullname', table_name='students')
    op.drop_index('idx_students_school_id', table_name='students')

