"""add notification system

Revision ID: add_notification_system
Revises: 
Create Date: 2026-01-18

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_notification_system'
down_revision = None  # Update this with your latest migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='normal'),
        sa.Column('target_role', sa.String(length=50), nullable=True),
        sa.Column('target_user_ids', sa.Text(), nullable=True),
        sa.Column('target_class_ids', sa.Text(), nullable=True),
        sa.Column('related_entity_type', sa.String(length=50), nullable=True),
        sa.Column('related_entity_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('action_url', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better performance
    op.create_index('idx_notifications_school_id', 'notifications', ['school_id'])
    op.create_index('idx_notifications_type', 'notifications', ['type'])
    op.create_index('idx_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('idx_notifications_target_role', 'notifications', ['target_role'])
    op.create_index('idx_notifications_is_active', 'notifications', ['is_active'])
    
    # Create notification_reads table
    op.create_table('notification_reads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('notification_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['notification_id'], ['notifications.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('notification_id', 'user_id', name='unique_notification_read')
    )
    
    # Create indexes
    op.create_index('idx_notification_reads_user_id', 'notification_reads', ['user_id'])
    op.create_index('idx_notification_reads_notification_id', 'notification_reads', ['notification_id'])
    
    # Create push_subscriptions table
    op.create_table('push_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('endpoint', sa.Text(), nullable=False),
        sa.Column('p256dh_key', sa.Text(), nullable=False),
        sa.Column('auth_key', sa.Text(), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('device_name', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'endpoint', name='unique_user_subscription')
    )
    
    # Create indexes
    op.create_index('idx_push_subscriptions_user_id', 'push_subscriptions', ['user_id'])
    
    # Create notification_preferences table
    op.create_table('notification_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('attendance_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('bus_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('behavior_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('timetable_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('substitution_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('news_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('general_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('push_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    
    # Create index
    op.create_index('idx_notification_preferences_user_id', 'notification_preferences', ['user_id'])


def downgrade():
    # Drop tables in reverse order
    op.drop_index('idx_notification_preferences_user_id', table_name='notification_preferences')
    op.drop_table('notification_preferences')
    
    op.drop_index('idx_push_subscriptions_user_id', table_name='push_subscriptions')
    op.drop_table('push_subscriptions')
    
    op.drop_index('idx_notification_reads_notification_id', table_name='notification_reads')
    op.drop_index('idx_notification_reads_user_id', table_name='notification_reads')
    op.drop_table('notification_reads')
    
    op.drop_index('idx_notifications_is_active', table_name='notifications')
    op.drop_index('idx_notifications_target_role', table_name='notifications')
    op.drop_index('idx_notifications_created_at', table_name='notifications')
    op.drop_index('idx_notifications_type', table_name='notifications')
    op.drop_index('idx_notifications_school_id', table_name='notifications')
    op.drop_table('notifications')
