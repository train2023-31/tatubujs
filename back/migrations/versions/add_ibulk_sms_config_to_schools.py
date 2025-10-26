"""Add iBulk SMS configuration to schools

Revision ID: add_ibulk_sms_config
Revises: 078ced15c6ac_add_ip_and_mac_to_logs_content
Create Date: 2025-01-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'add_ibulk_sms_config'
down_revision = '078ced15c6ac_add_ip_and_mac_to_logs_content'
branch_labels = None
depends_on = None


def upgrade():
    # Add iBulk SMS configuration fields to schools table
    op.add_column('schools', sa.Column('ibulk_sms_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('schools', sa.Column('ibulk_username', sa.String(length=100), nullable=True))
    op.add_column('schools', sa.Column('ibulk_password', sa.String(length=255), nullable=True))
    op.add_column('schools', sa.Column('ibulk_sender_id', sa.String(length=11), nullable=True))
    op.add_column('schools', sa.Column('ibulk_api_url', sa.String(length=255), nullable=True, server_default='https://ismartsms.net/api/send'))
    op.add_column('schools', sa.Column('ibulk_balance_threshold', sa.Float(), nullable=True, server_default='10.0'))
    op.add_column('schools', sa.Column('ibulk_last_balance_check', sa.DateTime(), nullable=True))
    op.add_column('schools', sa.Column('ibulk_current_balance', sa.Float(), nullable=True, server_default='0.0'))


def downgrade():
    # Remove iBulk SMS configuration fields from schools table
    op.drop_column('schools', 'ibulk_current_balance')
    op.drop_column('schools', 'ibulk_last_balance_check')
    op.drop_column('schools', 'ibulk_balance_threshold')
    op.drop_column('schools', 'ibulk_api_url')
    op.drop_column('schools', 'ibulk_sender_id')
    op.drop_column('schools', 'ibulk_password')
    op.drop_column('schools', 'ibulk_username')
    op.drop_column('schools', 'ibulk_sms_enabled')
