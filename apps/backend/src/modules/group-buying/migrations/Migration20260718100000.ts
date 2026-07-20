import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260718100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "receipt_ai_status" text not null default 'not_requested';`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "receipt_ai_confidence" numeric null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "raw_receipt_ai_confidence" jsonb null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "receipt_ai_job_id" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "receipt_ai_result" jsonb null;`
    )

    this.addSql(
      `alter table if exists "group_deal" add column if not exists "tracking_ai_status" text not null default 'not_requested';`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "tracking_ai_confidence" numeric null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "raw_tracking_ai_confidence" jsonb null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "tracking_ai_job_id" text null;`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "tracking_ai_result" jsonb null;`
    )

    this.addSql(
      `alter table if exists "group_deal" add column if not exists "report_stage" text not null default 'not_started';`
    )
    this.addSql(
      `alter table if exists "group_deal" add column if not exists "dispute_status" text not null default 'none';`
    )

    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_receipt_ai_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_receipt_ai_status_check" check ("receipt_ai_status" in ('not_requested', 'processing', 'parsed', 'needs_review', 'failed'));`
    )
    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_tracking_ai_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_tracking_ai_status_check" check ("tracking_ai_status" in ('not_requested', 'processing', 'parsed', 'needs_review', 'failed'));`
    )
    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_report_stage_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_report_stage_check" check ("report_stage" in ('not_started', 'receipt_review', 'shipping', 'settlement_ready', 'settled'));`
    )
    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_dispute_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" add constraint "group_deal_dispute_status_check" check ("dispute_status" in ('none', 'open', 'under_review', 'resolved'));`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_group_deal_receipt_ai_status" ON "group_deal" (receipt_ai_status) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_group_deal_tracking_ai_status" ON "group_deal" (tracking_ai_status) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_group_deal_report_stage" ON "group_deal" (report_stage) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_group_deal_dispute_status" ON "group_deal" (dispute_status) WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_group_deal_dispute_status";`
    )
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_group_deal_report_stage";`
    )
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_group_deal_tracking_ai_status";`
    )
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_group_deal_receipt_ai_status";`
    )

    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_dispute_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_report_stage_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_tracking_ai_status_check";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop constraint if exists "group_deal_receipt_ai_status_check";`
    )

    this.addSql(
      `alter table if exists "group_deal" drop column if exists "dispute_status";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "report_stage";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "tracking_ai_result";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "tracking_ai_job_id";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "raw_tracking_ai_confidence";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "tracking_ai_confidence";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "tracking_ai_status";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "receipt_ai_result";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "receipt_ai_job_id";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "raw_receipt_ai_confidence";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "receipt_ai_confidence";`
    )
    this.addSql(
      `alter table if exists "group_deal" drop column if exists "receipt_ai_status";`
    )
  }
}
