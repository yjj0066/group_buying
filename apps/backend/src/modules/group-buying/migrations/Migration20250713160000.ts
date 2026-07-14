import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250713160000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "min_participants" integer not null default 1;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "current_participants" integer not null default 0;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "max_quantity" integer null;`
    )

    this.addSql(
      `update "group_deal" set "min_participants" = "target_quantity" where "min_participants" = 1;`
    )
    this.addSql(
      `update "group_deal" set "max_quantity" = "target_quantity" where "max_quantity" is null;`
    )
    this.addSql(
      `update "group_deal" set "status" = 'open' where "status" = 'active';`
    )
    this.addSql(
      `update "group_deal" set "status" = 'closed' where "status" = 'success';`
    )

    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_status_check" check ("status" in ('draft', 'open', 'minimum_reached', 'closed', 'failed', 'cancelled'));`
    )

    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "cart_id" text null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "cart_id";`
    )

    this.addSql(
      `update "group_deal" set "status" = 'active' where "status" = 'open';`
    )
    this.addSql(
      `update "group_deal" set "status" = 'success' where "status" in ('minimum_reached', 'closed');`
    )

    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_status_check" check ("status" in ('draft', 'active', 'success', 'failed', 'cancelled'));`
    )

    this.addSql(
      `alter table if exists "group_deal" drop column if exists "max_quantity";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "current_participants";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "min_participants";`
    )
  }
}
