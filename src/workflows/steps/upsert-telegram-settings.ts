import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { TELEGRAM_MODULE } from "../../modules/telegram"
import type TelegramModuleService from "../../modules/telegram/service"
import type { TelegramSettingsData } from "../../modules/telegram/types"

export type UpsertTelegramSettingsStepInput = Partial<TelegramSettingsData>

type CompensationInput =
  | { created_id: string }
  | { previous: TelegramSettingsData & { id: string } }

export const upsertTelegramSettingsStep = createStep(
  "upsert-telegram-settings",
  async (input: UpsertTelegramSettingsStepInput, { container }) => {
    const telegramService: TelegramModuleService = container.resolve(TELEGRAM_MODULE)

    const [existing] = await telegramService.listTelegramSettings({}, { take: 1 })

    if (!existing) {
      const created = await telegramService.createTelegramSettings(input)
      return new StepResponse<typeof created, CompensationInput>(created, {
        created_id: created.id,
      })
    }

    const updated = await telegramService.updateTelegramSettings({
      id: existing.id,
      ...input,
    })

    return new StepResponse<typeof updated, CompensationInput>(updated, {
      previous: {
        id: existing.id,
        enabled_events: (existing.enabled_events ?? []) as TelegramSettingsData["enabled_events"],
        language: existing.language,
        admin_url: existing.admin_url,
        include_contact_details: existing.include_contact_details,
      },
    })
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }

    const telegramService: TelegramModuleService = container.resolve(TELEGRAM_MODULE)

    if ("created_id" in compensation) {
      await telegramService.deleteTelegramSettings(compensation.created_id)
      return
    }

    await telegramService.updateTelegramSettings(compensation.previous)
  }
)
