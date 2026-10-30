import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { TELEGRAM_MODULE } from "../../../../modules/telegram"
import { LANGUAGES } from "../../../../modules/telegram/messages"
import type TelegramModuleService from "../../../../modules/telegram/service"
import { TELEGRAM_EVENTS } from "../../../../modules/telegram/types"
import { updateTelegramSettingsWorkflow } from "../../../../workflows/update-telegram-settings"
import type { UpdateTelegramSettingsSchema } from "../middlewares"

async function buildResponse(telegramService: TelegramModuleService) {
  const { id, ...settings } = await telegramService.getSettings()

  return {
    settings,
    // false until the admin saves once, so the UI can prefill detected defaults
    persisted: !!id,
    configured: await telegramService.isConfigured(),
    available_events: TELEGRAM_EVENTS,
    languages: LANGUAGES.map(({ code, display_name }) => ({ code, display_name })),
  }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const telegramService: TelegramModuleService = req.scope.resolve(TELEGRAM_MODULE)

  res.json(await buildResponse(telegramService))
}

export async function POST(
  req: AuthenticatedMedusaRequest<UpdateTelegramSettingsSchema>,
  res: MedusaResponse
) {
  await updateTelegramSettingsWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  const telegramService: TelegramModuleService = req.scope.resolve(TELEGRAM_MODULE)

  res.json(await buildResponse(telegramService))
}
