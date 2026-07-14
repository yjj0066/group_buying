import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250714153000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "billing_customer_key" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "billing_key_encrypted" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "payment_session_id" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "capture_attempts" integer not null default 0;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "last_capture_error" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "reserved_at" timestamptz null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "captured_at" timestamptz null;`
    )

    this.addSql(
      `alter table if exists "group_deal_participant" drop constraint if exists "group_deal_participant_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add constraint "group_deal_participant_status_check" check ("status" in ('pending', 'reserved', 'confirmed', 'capture_failed', 'cancelled'));`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `update "group_deal_participant" set "status" = 'pending' where "status" in ('reserved', 'capture_failed');`
    )

    this.addSql(
      `alter table if exists "group_deal_participant" drop constraint if exists "group_deal_participant_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add constraint "group_deal_participant_status_check" check ("status" in ('pending', 'confirmed', 'cancelled'));`
    )

    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "captured_at";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "reserved_at";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "last_capture_error";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "capture_attempts";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "payment_session_id";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "billing_key_encrypted";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "billing_customer_key";`
    )
  }
}
