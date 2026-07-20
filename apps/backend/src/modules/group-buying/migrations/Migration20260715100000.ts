import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260715100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "raw_deposit_amount" jsonb null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "raw_deposit_amount";`
    )
  }
}
