import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260714190000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "purchase_receipt_url" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "purchase_receipt_status" text not null default 'pending';`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "purchase_receipt_verified_at" timestamptz null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_purchase_receipt_status_check" check ("purchase_receipt_status" in ('pending', 'uploaded', 'verified', 'rejected'));`
    )

    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "tracking_number" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "carrier" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "tracking_updated_at" timestamptz null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "tracking_updated_at";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "carrier";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "tracking_number";`
    )

    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_purchase_receipt_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "purchase_receipt_verified_at";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "purchase_receipt_status";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "purchase_receipt_url";`
    )
  }
}
