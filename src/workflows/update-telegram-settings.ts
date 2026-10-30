import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  upsertTelegramSettingsStep,
  UpsertTelegramSettingsStepInput,
} from "./steps/upsert-telegram-settings"

export const updateTelegramSettingsWorkflow = createWorkflow(
  "update-telegram-settings",
  function (input: UpsertTelegramSettingsStepInput) {
    const settings = upsertTelegramSettingsStep(input)

    return new WorkflowResponse(settings)
  }
)
