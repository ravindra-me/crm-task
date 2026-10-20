from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamp(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "contacts",
        sa.Column("id", sa.BigInteger, sa.Identity(), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(254)),
        sa.Column("phone", sa.String(32)),
        sa.Column(
            "phone_digits",
            sa.String(32),
            sa.Computed("regexp_replace(phone, '[^0-9]', '', 'g')", persisted=True),
        ),
        sa.Column("company", sa.String(200)),
        sa.Column("version", sa.Integer, server_default="1", nullable=False),
        timestamp("created_at"),
        timestamp("updated_at"),
        sa.PrimaryKeyConstraint("id", name="pk_contacts"),
    )
    op.execute("CREATE UNIQUE INDEX uq_contacts_email_lower ON contacts (lower(email))")
    op.execute("CREATE INDEX ix_contacts_created_at ON contacts (created_at, id)")
    op.execute(
        "CREATE INDEX ix_contacts_name_sort ON contacts (lower(first_name), lower(last_name), id)"
    )
    op.execute(
        "CREATE INDEX ix_contacts_full_name_trgm ON contacts "
        "USING gin (lower(first_name || ' ' || last_name) gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_contacts_email_trgm ON contacts USING gin (lower(email) gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_contacts_phone_digits_trgm ON contacts "
        "USING gin (phone_digits gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_contacts_company_trgm ON contacts USING gin (lower(company) gin_trgm_ops)"
    )

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer, sa.Identity(), nullable=False),
        sa.Column("name", sa.String(40), nullable=False),
        timestamp("created_at"),
        sa.PrimaryKeyConstraint("id", name="pk_tags"),
    )
    op.execute("CREATE UNIQUE INDEX uq_tags_name_lower ON tags (lower(name))")

    op.create_table(
        "contact_tags",
        sa.Column("contact_id", sa.BigInteger, nullable=False),
        sa.Column("tag_id", sa.Integer, nullable=False),
        timestamp("created_at"),
        sa.PrimaryKeyConstraint("contact_id", "tag_id", name="pk_contact_tags"),
        sa.ForeignKeyConstraint(
            ["contact_id"],
            ["contacts.id"],
            name="fk_contact_tags_contact_id_contacts",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"], ["tags.id"], name="fk_contact_tags_tag_id_tags", ondelete="CASCADE"
        ),
    )
    op.create_index("ix_contact_tags_tag_id", "contact_tags", ["tag_id", "contact_id"])

    op.create_table(
        "contact_activities",
        sa.Column("id", sa.BigInteger, sa.Identity(), nullable=False),
        sa.Column("contact_id", sa.BigInteger, nullable=False),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("details", JSONB, server_default="{}", nullable=False),
        timestamp("created_at"),
        sa.PrimaryKeyConstraint("id", name="pk_contact_activities"),
        sa.ForeignKeyConstraint(
            ["contact_id"],
            ["contacts.id"],
            name="fk_contact_activities_contact_id_contacts",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "type IN ('CONTACT_UPDATED', 'TAG_ADDED', 'TAG_REMOVED')",
            name="ck_contact_activities_type",
        ),
    )
    op.execute(
        "CREATE INDEX ix_contact_activities_contact_recent "
        "ON contact_activities (contact_id, created_at DESC, id DESC)"
    )


def downgrade() -> None:
    op.drop_table("contact_activities")
    op.drop_table("contact_tags")
    op.drop_table("tags")
    op.drop_table("contacts")
