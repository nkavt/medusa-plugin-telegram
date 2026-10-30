import type { Logger } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import TelegramSettings from "./models/telegram-settings"
import { isSupportedLanguage } from "./messages"
import {
  DEFAULT_ENABLED_EVENTS,
  TELEGRAM_EVENTS,
  TelegramEvent,
  TelegramPluginOptions,
  TelegramSettingsData,
} from "./types"

type InjectedDependencies = {
  logger: Logger
}

const TELEGRAM_API_URL = "https://api.telegram.org"
const REQUEST_TIMEOUT_MS = 10_000

export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly errorCode?: number
  ) {
    super(message)
    this.name = "TelegramApiError"
  }
}

class TelegramModuleService extends MedusaService({
  TelegramSettings,
}) {
  protected logger_: Logger
  protected options_: TelegramPluginOptions

  constructor(
    container: InjectedDependencies,
    options: TelegramPluginOptions = {}
  ) {
    super(...arguments)

    this.logger_ = container.logger
    this.options_ = options
  }

  async isConfigured(): Promise<boolean> {
    return !!this.options_.botToken && !!this.options_.chatId
  }

  /**
   * Returns the stored settings, or the defaults when nothing was saved yet.
   */
  async getSettings(): Promise<TelegramSettingsData & { id: string | null }> {
    const [stored] = await this.listTelegramSettings({}, { take: 1 })

    const enabledEvents = Array.isArray(stored?.enabled_events)
      ? stored.enabled_events.filter((event): event is TelegramEvent =>
          (TELEGRAM_EVENTS as readonly string[]).includes(event)
        )
      : DEFAULT_ENABLED_EVENTS

    return {
      id: stored?.id ?? null,
      enabled_events: enabledEvents,
      language:
        stored?.language && isSupportedLanguage(stored.language)
          ? stored.language
          : "en",
      admin_url: stored?.admin_url || this.options_.adminUrl || null,
      include_contact_details: stored?.include_contact_details ?? true,
    }
  }

  /**
   * Sends an HTML-formatted message to the configured chat.
   * Throws a TelegramApiError with the reason when sending fails.
   */
  async sendMessage(html: string): Promise<void> {
    if (!(await this.isConfigured())) {
      throw new TelegramApiError(
        "Telegram is not configured: the botToken and chatId plugin options are required"
      )
    }

    let response: Response
    try {
      response = await fetch(
        `${TELEGRAM_API_URL}/bot${this.options_.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: this.options_.chatId,
            text: html,
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      )
    } catch (error) {
      const reason =
        error instanceof Error && error.name === "TimeoutError"
          ? `request timed out after ${REQUEST_TIMEOUT_MS}ms`
          : (error as Error)?.message ?? String(error)
      throw new TelegramApiError(`Could not reach the Telegram API: ${reason}`)
    }

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean
      error_code?: number
      description?: string
    } | null

    if (!response.ok || !body?.ok) {
      const code = body?.error_code ?? response.status
      const description = body?.description ?? response.statusText
      throw new TelegramApiError(`Telegram API error ${code}: ${description}`, code)
    }
  }
}

export default TelegramModuleService
