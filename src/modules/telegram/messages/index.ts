import type { TelegramEvent } from "../types"
import { LANGUAGES } from "./languages"
import { locales } from "./locales"
import type { MessageStrings } from "./types"

export { LANGUAGES }
export type { MessageStrings }

const EVENT_ICONS: Record<TelegramEvent, string> = {
  "customer.created": "👤",
  "order.placed": "🛒",
  "order.canceled": "❌",
  "order.completed": "✅",
  "order.fulfillment_created": "📦",
  "order.return_requested": "↩️",
  "order.return_received": "📥",
}

export type MessageCustomer = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
}

export type MessageOrder = {
  id: string
  display_id?: number | string | null
  email?: string | null
  currency_code?: string | null
  total?: unknown
  customer?: MessageCustomer | null
  shipping_address?: MessageCustomer | null
}

export function isSupportedLanguage(code: string): boolean {
  return code in locales
}

function getStrings(language: string): MessageStrings {
  return locales[language] ?? locales.en
}

function getIntlLocale(language: string): string {
  return LANGUAGES.find((l) => l.code === language)?.intl ?? "en-US"
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "")
}

/**
 * Totals from Query can be plain numbers or BigNumber-like objects.
 */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === "object" && "numeric" in (value as object)) {
    return Number((value as { numeric: unknown }).numeric)
  }
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function formatMoney(
  amount: unknown,
  currencyCode: string | null | undefined,
  language: string
): string | null {
  const value = toNumber(amount)
  if (value === null) {
    return null
  }
  if (!currencyCode) {
    return String(value)
  }
  try {
    return new Intl.NumberFormat(getIntlLocale(language), {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).format(value)
  } catch {
    return `${value} ${currencyCode.toUpperCase()}`
  }
}

function fullName(person?: MessageCustomer | null): string {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()
}

/**
 * Telegram refuses inline links to hosts like localhost, so those are sent as plain text.
 */
function adminLink(
  adminUrl: string | null | undefined,
  path: string,
  label: string
): string | null {
  if (!adminUrl) {
    return null
  }
  const url = `${adminUrl.replace(/\/+$/, "")}/${path}`
  let isPublicHost = false
  try {
    const { hostname } = new URL(url)
    isPublicHost = hostname.includes(".") && !/^(127\.|0\.0\.0\.0)/.test(hostname)
  } catch {
    return null
  }
  return isPublicHost
    ? `🔗 <a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`
    : `🔗 ${escapeHtml(url)}`
}

function line(label: string, value: string | null | undefined): string | null {
  return value ? `${escapeHtml(label)}: ${escapeHtml(value)}` : null
}

function compose(lines: (string | null)[]): string {
  return lines.filter((l): l is string => l !== null).join("\n")
}

export type BuildMessageOptions = {
  language: string
  adminUrl?: string | null
  /**
   * Include the customer's email and phone. Defaults to true.
   */
  includeContactDetails?: boolean
}

export function buildCustomerMessage(
  customer: MessageCustomer & { id: string },
  { language, adminUrl, includeContactDetails = true }: BuildMessageOptions
): string {
  const t = getStrings(language)

  return compose([
    `${EVENT_ICONS["customer.created"]} <b>${escapeHtml(t.customer_created)}</b>`,
    "",
    line(t.customer, fullName(customer)),
    includeContactDetails ? line(t.email, customer.email) : null,
    includeContactDetails ? line(t.phone, customer.phone) : null,
    adminLink(adminUrl, `customers/${customer.id}`, t.open_in_admin),
  ])
}

export function buildOrderMessage(
  event: Exclude<TelegramEvent, "customer.created">,
  order: MessageOrder,
  { language, adminUrl, includeContactDetails = true }: BuildMessageOptions
): string {
  const t = getStrings(language)
  const key = event.replace(".", "_") as keyof MessageStrings
  const title = interpolate(t[key], { id: String(order.display_id ?? order.id) })

  const name =
    fullName(order.customer) || fullName(order.shipping_address) || t.guest
  const email = order.customer?.email || order.email
  const phone = order.customer?.phone || order.shipping_address?.phone

  return compose([
    `${EVENT_ICONS[event]} <b>${escapeHtml(title)}</b>`,
    "",
    line(t.customer, name),
    includeContactDetails ? line(t.email, email) : null,
    includeContactDetails ? line(t.phone, phone) : null,
    line(t.total, formatMoney(order.total, order.currency_code, language)),
    adminLink(adminUrl, `orders/${order.id}`, t.open_in_admin),
  ])
}

export function buildTestMessage(language: string): string {
  return `🤖 ${escapeHtml(getStrings(language).test_message)}`
}
