import { sdk } from "./client"

export const TELEGRAM_NS = "telegram"

export const telegramSettingsQueryKey = ["telegram-settings"]

export type TelegramSettings = {
  enabled_events: string[]
  language: string
  admin_url: string | null
  include_contact_details: boolean
}

export type TelegramSettingsResponse = {
  settings: TelegramSettings
  persisted: boolean
  configured: boolean
  available_events: string[]
  languages: { code: string; display_name: string }[]
}

export const fetchTelegramSettings = () =>
  sdk.client.fetch<TelegramSettingsResponse>("/admin/telegram/settings")

export const saveTelegramSettings = (body: Partial<TelegramSettings>) =>
  sdk.client.fetch<TelegramSettingsResponse>("/admin/telegram/settings", {
    method: "POST",
    body,
  })

export const sendTelegramTestMessage = () =>
  sdk.client.fetch<{ success: boolean }>("/admin/telegram/test-message", {
    method: "POST",
  })

/**
 * Admin dashboard base URL (e.g. https://shop.com/app), derived from the page we are on,
 * so no env var is needed for links in Telegram messages.
 */
export const detectAdminUrl = () => {
  const { origin, pathname } = window.location
  const base = pathname.split("/settings/")[0]
  return `${origin}${base}`.replace(/\/+$/, "")
}

/** "order.placed" -> "order_placed", matching the translation keys */
export const eventKey = (event: string) => event.replace(".", "_")
