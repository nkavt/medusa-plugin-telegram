import { MiddlewareRoute, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { TELEGRAM_EVENTS } from "../../../modules/telegram/types"
import { LANGUAGES } from "../../../modules/telegram/messages"

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [string, ...string[]]

export const UpdateTelegramSettingsSchema = z.object({
  enabled_events: z.array(z.enum(TELEGRAM_EVENTS)).optional(),
  language: z.enum(LANGUAGE_CODES).optional(),
  admin_url: z
    .url({ protocol: /^https?$/ })
    .nullable()
    .optional(),
  include_contact_details: z.boolean().optional(),
})

export type UpdateTelegramSettingsSchema = z.infer<typeof UpdateTelegramSettingsSchema>

export const telegramMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/telegram/settings",
    method: "POST",
    middlewares: [validateAndTransformBody(UpdateTelegramSettingsSchema)],
  },
]
