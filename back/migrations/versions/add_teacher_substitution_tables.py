"""add teacher substitution tables

Revision ID: add_teacher_substitution_tables
Revises: add_timetable_models
Create Date: 2026-01-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'add_teacher_substitution_tables'
down_revision = 'add_timetable_models'
branch_labels = None
depends_on = None


def upgrade():
    # Create teacher_substitutions table
    op.create_table(
        'teacher_substitutions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timetable_id', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.Integer(), nullable=False),
        sa.Column('absent_teacher_xml_id', sa.String(length=100), nullable=False),
        sa.Column('absent_teacher_user_id', sa.Integer(), nullable=True),
        sa.Column('absent_teacher_name', sa.String(length=255), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('distribution_criteria', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['timetable_id'], ['timetables.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['absent_teacher_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for teacher_substitutions
    op.create_index('idx_substitutions_timetable', 'teacher_substitutions', ['timetable_id'])
    op.create_index('idx_substitutions_school', 'teacher_substitutions', ['school_id'])
    op.create_index('idx_substitutions_absent_teacher', 'teacher_substitutions', ['absent_teacher_user_id'])
    op.create_index('idx_substitutions_dates', 'teacher_substitutions', ['start_date', 'end_date'])
    op.create_index('idx_substitutions_active', 'teacher_substitutions', ['is_active'])
    
    # Create substitution_assignments table
    op.create_table(
        'substitution_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('substitution_id', sa.Integer(), nullable=False),
        sa.Column('schedule_id', sa.Integer(), nullable=False),
        sa.Column('class_name', sa.String(length=100), nullable=False),
        sa.Column('subject_name', sa.String(length=100), nullable=False),
        sa.Column('day_xml_id', sa.String(length=50), nullable=False),
        sa.Column('period_xml_id', sa.String(length=50), nullable=False),
        sa.Column('substitute_teacher_xml_id', sa.String(length=100), nullable=False),
        sa.Column('substitute_teacher_user_id', sa.Integer(), nullable=True),
        sa.Column('substitute_teacher_name', sa.String(length=255), nullable=False),
        sa.Column('assignment_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['substitution_id'], ['teacher_substitutions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['schedule_id'], ['timetable_schedules.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['substitute_teacher_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for substitution_assignments
    op.create_index('idx_assignments_substitution', 'substitution_assignments', ['substitution_id'])
    op.create_index('idx_assignments_schedule', 'substitution_assignments', ['schedule_id'])
    op.create_index('idx_assignments_substitute_teacher', 'substitution_assignments', ['substitute_teacher_user_id'])
    op.create_index('idx_assignments_time_slot', 'substitution_assignments', ['day_xml_id', 'period_xml_id'])


def downgrade():
    # Drop indexes first
    op.drop_index('idx_assignments_time_slot', table_name='substitution_assignments')
    op.drop_index('idx_assignments_substitute_teacher', table_name='substitution_assignments')
    op.drop_index('idx_assignments_schedule', table_name='substitution_assignments')
    op.drop_index('idx_assignments_substitution', table_name='substitution_assignments')
    
    op.drop_index('idx_substitutions_active', table_name='teacher_substitutions')
    op.drop_index('idx_substitutions_dates', table_name='teacher_substitutions')
    op.drop_index('idx_substitutions_absent_teacher', table_name='teacher_substitutions')
    op.drop_index('idx_substitutions_school', table_name='teacher_substitutions')
    op.drop_index('idx_substitutions_timetable', table_name='teacher_substitutions')
    
    # Drop tables in reverse order (child first)
    op.drop_table('substitution_assignments')
    op.drop_table('teacher_substitutions')
