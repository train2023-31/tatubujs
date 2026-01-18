"""add timetable models

Revision ID: add_timetable_models
Revises: 
Create Date: 2026-01-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_timetable_models'
down_revision = None  # Update this to the latest migration ID
branch_label = None
depends_on = None


def upgrade():
    # Create timetables table
    op.create_table('timetables',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('school_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('xml_data', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create timetable_days table
    op.create_table('timetable_days',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timetable_id', sa.Integer(), nullable=False),
        sa.Column('day_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('short_name', sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(['timetable_id'], ['timetables.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create timetable_periods table
    op.create_table('timetable_periods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timetable_id', sa.Integer(), nullable=False),
        sa.Column('period_id', sa.String(length=50), nullable=False),
        sa.Column('period_number', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.String(length=10), nullable=False),
        sa.Column('end_time', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['timetable_id'], ['timetables.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create timetable_teacher_mappings table
    op.create_table('timetable_teacher_mappings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timetable_id', sa.Integer(), nullable=False),
        sa.Column('xml_teacher_id', sa.String(length=100), nullable=False),
        sa.Column('xml_teacher_name', sa.String(length=255), nullable=False),
        sa.Column('teacher_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['timetable_id'], ['timetables.id'], ),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('timetable_id', 'xml_teacher_id', name='unique_teacher_mapping')
    )
    
    # Create timetable_schedules table
    op.create_table('timetable_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timetable_id', sa.Integer(), nullable=False),
        sa.Column('class_name', sa.String(length=100), nullable=False),
        sa.Column('class_xml_id', sa.String(length=100), nullable=False),
        sa.Column('subject_name', sa.String(length=100), nullable=False),
        sa.Column('subject_xml_id', sa.String(length=100), nullable=False),
        sa.Column('teacher_xml_id', sa.String(length=100), nullable=True),
        sa.Column('classroom_name', sa.String(length=100), nullable=True),
        sa.Column('day_xml_id', sa.String(length=50), nullable=False),
        sa.Column('period_xml_id', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['timetable_id'], ['timetables.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('idx_timetable_school', 'timetables', ['school_id'])
    op.create_index('idx_timetable_active', 'timetables', ['is_active'])
    op.create_index('idx_schedule_timetable', 'timetable_schedules', ['timetable_id'])
    op.create_index('idx_schedule_class', 'timetable_schedules', ['class_xml_id'])
    op.create_index('idx_schedule_teacher', 'timetable_schedules', ['teacher_xml_id'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_schedule_teacher', table_name='timetable_schedules')
    op.drop_index('idx_schedule_class', table_name='timetable_schedules')
    op.drop_index('idx_schedule_timetable', table_name='timetable_schedules')
    op.drop_index('idx_timetable_active', table_name='timetables')
    op.drop_index('idx_timetable_school', table_name='timetables')
    
    # Drop tables
    op.drop_table('timetable_schedules')
    op.drop_table('timetable_teacher_mappings')
    op.drop_table('timetable_periods')
    op.drop_table('timetable_days')
    op.drop_table('timetables')
