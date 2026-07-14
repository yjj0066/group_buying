import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260714140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "payment_provider_id" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "stripe_customer_id" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "stripe_payment_method_id_encrypted" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "stripe_payment_method_id_encrypted";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "stripe_customer_id";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "payment_provider_id";`
    )
  }
}
