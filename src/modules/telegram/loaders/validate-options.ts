import type { LoaderOptions } from "@medusajs/framework/types"
import type { TelegramPluginOptions } from "../types"

export default async function validateOptionsLoader({
  options,
  logger,
}: LoaderOptions<TelegramPluginOptions>) {
  const missing = [
    !options?.botToken && "botToken",
    !options?.chatId && "chatId",
  ].filter(Boolean)

  if (missing.length) {
    logger?.warn(
      `[telegram] Missing plugin option(s): ${missing.join(", ")}. Telegram notifications are disabled until they are set.`
    )
  }
}
