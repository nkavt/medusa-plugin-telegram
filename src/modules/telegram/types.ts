export const TELEGRAM_EVENTS = [
  "customer.created",
  "order.placed",
  "order.canceled",
  "order.completed",
  "order.fulfillment_created",
  "order.return_requested",
  "order.return_received",
] as const

export type TelegramEvent = (typeof TELEGRAM_EVENTS)[number]

export const DEFAULT_ENABLED_EVENTS: TelegramEvent[] = [
  "customer.created",
  "order.placed",
  "order.canceled",
]

export type TelegramPluginOptions = {
  /**
   * Bot token from @BotFather.
   */
  botToken?: string
  /**
   * Chat, group or channel ID that receives the notifications.
   */
  chatId?: string | number
  /**
   * Fallback admin dashboard URL (e.g. https://shop.com/app), used for links
   * until it is detected/saved from the admin settings page.
   */
  adminUrl?: string
}

export type TelegramSettingsData = {
  enabled_events: TelegramEvent[]
  language: string
  admin_url: string | null
  /**
   * Whether the customer's email and phone are included in messages.
   */
  include_contact_details: boolean
}
