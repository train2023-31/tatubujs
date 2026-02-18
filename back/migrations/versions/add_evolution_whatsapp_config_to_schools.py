"""Add Evolution API WhatsApp configuration to schools

Revision ID: add_evolution_whatsapp_config
Revises: add_ibulk_sms_config
Create Date: 2026-02-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_evolution_whatsapp_config'
down_revision = 'add_ibulk_sms_config'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('schools', sa.Column('evolution_whatsapp_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('schools', sa.Column('evolution_api_url', sa.String(length=255), nullable=True))
    op.add_column('schools', sa.Column('evolution_api_key', sa.String(length=255), nullable=True))
    op.add_column('schools', sa.Column('evolution_instance_name', sa.String(length=100), nullable=True))
    op.add_column('schools', sa.Column('evolution_instance_token', sa.String(length=255), nullable=True))
    op.add_column('schools', sa.Column('evolution_phone_number', sa.String(length=20), nullable=True))
    op.add_column('schools', sa.Column('evolution_instance_status', sa.String(length=50), nullable=True, server_default='disconnected'))


def downgrade():
    op.drop_column('schools', 'evolution_instance_status')
    op.drop_column('schools', 'evolution_phone_number')
    op.drop_column('schools', 'evolution_instance_token')
    op.drop_column('schools', 'evolution_instance_name')
    op.drop_column('schools', 'evolution_api_key')
    op.drop_column('schools', 'evolution_api_url')
    op.drop_column('schools', 'evolution_whatsapp_enabled')
