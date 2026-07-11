import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250710120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "group_deal" ("id" text not null, "title" text not null, "description" text null, "product_id" text not null, "variant_id" text null, "target_quantity" integer not null, "current_quantity" integer not null default 0, "original_price" numeric not null, "deal_price" numeric not null, "currency_code" text not null, "status" text check ("status" in (\'draft\', \'active\', \'success\', \'failed\', \'cancelled\')) not null default \'draft\', "starts_at" timestamptz not null, "ends_at" timestamptz not null, "metadata" jsonb null, "raw_original_price" jsonb not null, "raw_deal_price" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "group_deal_pkey" primary key ("id"));'
    )

    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_group_deal_deleted_at" ON "group_deal" (deleted_at) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_group_deal_status" ON "group_deal" (status) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'create table if not exists "group_deal_participant" ("id" text not null, "customer_id" text null, "email" text not null, "quantity" integer not null default 1, "status" text check ("status" in (\'pending\', \'confirmed\', \'cancelled\')) not null default \'pending\', "order_id" text null, "group_deal_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "group_deal_participant_pkey" primary key ("id"));'
    )

    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_group_deal_participant_deleted_at" ON "group_deal_participant" (deleted_at) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_group_deal_participant_group_deal_id" ON "group_deal_participant" (group_deal_id) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'alter table if exists "group_deal_participant" add constraint "group_deal_participant_group_deal_id_foreign" foreign key ("group_deal_id") references "group_deal" ("id") on update cascade on delete cascade;'
    )
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table if exists "group_deal_participant" drop constraint if exists "group_deal_participant_group_deal_id_foreign";'
    )
    this.addSql('drop table if exists "group_deal_participant" cascade;')
    this.addSql('drop table if exists "group_deal" cascade;')
  }
}
