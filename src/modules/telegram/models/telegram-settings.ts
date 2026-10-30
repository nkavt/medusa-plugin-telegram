import { model } from "@medusajs/framework/utils"

/**
 * Singleton row holding the admin-configurable notification settings.
 * The bot token and chat ID are not stored here - they come from plugin options.
 */
const TelegramSettings = model.define("telegram_settings", {
  id: model.id({ prefix: "tgset" }).primaryKey(),
  enabled_events: model.array().nullable(),
  language: model.text().default("en"),
  admin_url: model.text().nullable(),
  include_contact_details: model.boolean().default(true),
})

export default TelegramSettings
