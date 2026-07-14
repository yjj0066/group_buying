import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250714170000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "payment_phase_mode" text not null default 'single';`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "shipping_fee_status" text not null default 'not_applicable';`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "estimated_shipping_fee" numeric null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "raw_estimated_shipping_fee" jsonb null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "shipping_fee_note" text null;`
    )

    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_payment_phase_mode_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_payment_phase_mode_check" check ("payment_phase_mode" in ('single', 'split_product_shipping'));`
    )
    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_shipping_fee_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_shipping_fee_status_check" check ("shipping_fee_status" in ('not_applicable', 'pending_quote', 'quoted', 'collecting', 'completed'));`
    )

    this.addSql(
      `create table if not exists "group_deal_option" ("id" text not null, "option_type" text check ("option_type" in ('member', 'version', 'custom')) not null default 'member', "option_key" text not null, "label" text not null, "deal_price" numeric null, "original_price" numeric null, "raw_deal_price" jsonb null, "raw_original_price" jsonb null, "max_quantity" integer null, "target_quantity" integer null, "current_quantity" integer not null default 0, "sort_order" integer not null default 0, "is_active" boolean not null default true, "metadata" jsonb null, "group_deal_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "group_deal_option_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_group_deal_option_group_deal_id" ON "group_deal_option" (group_deal_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "group_deal_option" add constraint "group_deal_option_group_deal_id_foreign" foreign key ("group_deal_id") references "group_deal" ("id") on update cascade on delete cascade;`
    )

    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "first_payment_amount" numeric null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "raw_first_payment_amount" jsonb null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "second_payment_amount" numeric null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "raw_second_payment_amount" jsonb null;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "second_payment_status" text not null default 'not_required';`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add column if not exists "second_payment_order_id" text null;`
    )

    this.addSql(
      `alter table if exists "group_deal_participant" drop constraint if exists "group_deal_participant_second_payment_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" add constraint "group_deal_participant_second_payment_status_check" check ("second_payment_status" in ('not_required', 'pending_quote', 'ready', 'paid', 'waived'));`
    )

    this.addSql(
      `create table if not exists "group_deal_participant_selection" ("id" text not null, "quantity" integer not null default 1, "unit_price" numeric not null, "raw_unit_price" jsonb not null, "metadata" jsonb null, "participant_id" text not null, "option_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "group_deal_participant_selection_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_group_deal_participant_selection_participant_id" ON "group_deal_participant_selection" (participant_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_group_deal_participant_selection_option_id" ON "group_deal_participant_selection" (option_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant_selection" add constraint "group_deal_participant_selection_participant_id_foreign" foreign key ("participant_id") references "group_deal_participant" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `alter table if exists "group_deal_participant_selection" add constraint "group_deal_participant_selection_option_id_foreign" foreign key ("option_id") references "group_deal_option" ("id") on update cascade on delete cascade;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal_participant_selection" drop constraint if exists "group_deal_participant_selection_option_id_foreign";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant_selection" drop constraint if exists "group_deal_participant_selection_participant_id_foreign";`
    )
    this.addSql(`drop table if exists "group_deal_participant_selection" cascade;`)

    this.addSql(
      `alter table if exists "group_deal_participant" drop constraint if exists "group_deal_participant_second_payment_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "second_payment_order_id";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "second_payment_status";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "raw_second_payment_amount";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "second_payment_amount";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "raw_first_payment_amount";`
    )
    this.addSql(
      `alter table if exists "group_deal_participant" drop column if exists "first_payment_amount";`
    )

    this.addSql(
      `alter table if exists "group_deal_option" drop constraint if exists "group_deal_option_group_deal_id_foreign";`
    )
    this.addSql(`drop table if exists "group_deal_option" cascade;`)

    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_shipping_fee_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_payment_phase_mode_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "shipping_fee_note";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "raw_estimated_shipping_fee";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "estimated_shipping_fee";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "shipping_fee_status";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "payment_phase_mode";`
    )
  }
}
