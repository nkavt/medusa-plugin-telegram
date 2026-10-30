import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261030111418 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "telegram_settings" ("id" text not null, "enabled_events" text[] null, "language" text not null default 'en', "admin_url" text null, "include_contact_details" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "telegram_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_telegram_settings_deleted_at" ON "telegram_settings" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "telegram_settings" cascade;`);
  }

}
