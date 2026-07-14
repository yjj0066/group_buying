import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260714180000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "leader_customer_id" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "deposit_status" text not null default 'pending';`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "deposit_amount" numeric null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "deposit_payment_key" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "deposit_paid_at" timestamptz null;`
    )

    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_status_check" check ("status" in ('draft', 'open', 'minimum_reached', 'closed', 'failed', 'cancelled', 'settled'));`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_deposit_status_check" check ("deposit_status" in ('pending', 'deposited', 'refunded'));`
    )

    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "payment_deadline" timestamptz null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "delivery_confirmed_at" timestamptz null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "waitlist_entry_id" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "capture_payment_key" text null;`
    )

    this.addSql(
      `create table if not exists "group_deal_waitlist_entry" ("id" text not null, "customer_id" text null, "email" text not null, "quantity" integer not null default 1, "queue_position" integer not null default 0, "priority" integer not null default 0, "status" text not null default 'waiting', "payment_deadline" timestamptz null, "matched_participant_id" text null, "matched_at" timestamptz null, "selections_snapshot" jsonb null, "metadata" jsonb null, "group_deal_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "group_deal_waitlist_entry_pkey" primary key ("id"));`
    )
    this.addSql(
      `alter table if exists "group_deal_waitlist_entry" add constraint "group_deal_waitlist_entry_group_deal_id_foreign" foreign key ("group_deal_id") references "group_deal" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `alter table if exists "group_deal_waitlist_entry" add constraint "group_deal_waitlist_entry_status_check" check ("status" in ('waiting', 'matched', 'expired', 'cancelled'));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_group_deal_waitlist_entry_group_deal_id" ON "group_deal_waitlist_entry" (group_deal_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_group_deal_waitlist_entry_status" ON "group_deal_waitlist_entry" (status) WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "group_deal_waitlist_entry" cascade;`)

    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "capture_payment_key";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "waitlist_entry_id";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "delivery_confirmed_at";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "payment_deadline";`
    )

    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_deposit_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "deposit_paid_at";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "deposit_payment_key";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "deposit_amount";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "deposit_status";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "leader_customer_id";`
    )

    this.addSql(
      `update "group_deal" set "status" = 'closed' where "status" = 'settled';`
    )
    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_status_check" check ("status" in ('draft', 'open', 'minimum_reached', 'closed', 'failed', 'cancelled'));`
    )
  }
}
