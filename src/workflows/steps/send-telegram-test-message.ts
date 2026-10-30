import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { TELEGRAM_MODULE } from "../../modules/telegram"
import { buildTestMessage } from "../../modules/telegram/messages"
import type TelegramModuleService from "../../modules/telegram/service"

export const sendTelegramTestMessageStep = createStep(
  "send-telegram-test-message",
  async (_, { container }) => {
    const telegramService: TelegramModuleService = container.resolve(TELEGRAM_MODULE)

    if (!(await telegramService.isConfigured())) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Telegram is not configured: set the botToken and chatId plugin options"
      )
    }

    const { language } = await telegramService.getSettings()

    try {
      await telegramService.sendMessage(buildTestMessage(language))
    } catch (error) {
      // Surface Telegram's reason (e.g. "chat not found") to the admin
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        (error as Error).message
      )
    }

    return new StepResponse({ success: true })
  }
)
