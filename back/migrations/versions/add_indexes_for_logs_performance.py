"""add_indexes_for_logs_performance

Revision ID: add_indexes_for_logs_performance
Revises: d779c673e6ea
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_indexes_for_logs_performance'
down_revision = 'd779c673e6ea'
branch_labels = None
depends_on = None


def upgrade():
    # Add indexes for ActionLog table to improve query performance
    op.create_index('idx_action_logs_timestamp', 'action_logs', ['timestamp'])
    op.create_index('idx_action_logs_user_id', 'action_logs', ['user_id'])
    op.create_index('idx_action_logs_timestamp_user_id', 'action_logs', ['timestamp', 'user_id'])
    
    # Add index for User table school_id for faster filtering
    op.create_index('idx_users_school_id', 'users', ['school_id'])
    
    # Add composite index for the most common query pattern
    op.create_index('idx_action_logs_user_school_timestamp', 'action_logs', ['user_id', 'timestamp'])


def downgrade():
    # Drop indexes in reverse order
    op.drop_index('idx_action_logs_user_school_timestamp', table_name='action_logs')
    op.drop_index('idx_users_school_id', table_name='users')
    op.drop_index('idx_action_logs_timestamp_user_id', table_name='action_logs')
    op.drop_index('idx_action_logs_user_id', table_name='action_logs')
    op.drop_index('idx_action_logs_timestamp', table_name='action_logs')
