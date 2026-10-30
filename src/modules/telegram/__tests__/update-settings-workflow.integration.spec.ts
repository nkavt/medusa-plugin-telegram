import {
  createStep,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { TELEGRAM_MODULE } from ".."
import { updateTelegramSettingsWorkflow } from "../../../workflows/update-telegram-settings"
import {
  upsertTelegramSettingsStep,
  UpsertTelegramSettingsStepInput,
} from "../../../workflows/steps/upsert-telegram-settings"
import TelegramSettings from "../models/telegram-settings"
import TelegramModuleService from "../service"

jest.setTimeout(60 * 1000)

const failingStep = createStep("telegram-test-failing-step", async () => {
  throw new Error("boom")
})

// Runs the real upsert step and then fails, to exercise its compensation
const upsertThenFailWorkflow = createWorkflow(
  "telegram-test-upsert-then-fail",
  function (input: UpsertTelegramSettingsStepInput) {
    const settings = upsertTelegramSettingsStep(input)
    failingStep()
    return new WorkflowResponse(settings)
  }
)

moduleIntegrationTestRunner<TelegramModuleService>({
  moduleName: TELEGRAM_MODULE,
  moduleModels: [TelegramSettings],
  resolve: "./src/modules/telegram",
  moduleOptions: { botToken: "123:test", chatId: -100 },
  testSuite: ({ service, medusaApp }) => {
    const container = () => medusaApp.sharedContainer

    describe("updateTelegramSettingsWorkflow", () => {
      it("creates the settings row on first save", async () => {
        await updateTelegramSettingsWorkflow(container()).run({
          input: { enabled_events: ["order.placed"], language: "ka" },
        })

        const rows = await service.listTelegramSettings()
        expect(rows).toHaveLength(1)
        expect(rows[0].enabled_events).toEqual(["order.placed"])
        expect(rows[0].language).toBe("ka")
      })

      it("updates the same row on later saves", async () => {
        await updateTelegramSettingsWorkflow(container()).run({
          input: { enabled_events: ["order.placed"] },
        })
        await updateTelegramSettingsWorkflow(container()).run({
          input: { include_contact_details: false },
        })

        const rows = await service.listTelegramSettings()
        expect(rows).toHaveLength(1)
        expect(rows[0].enabled_events).toEqual(["order.placed"])
        expect(rows[0].include_contact_details).toBe(false)
      })

      it("deletes a newly created row when the workflow fails", async () => {
        const { errors } = await upsertThenFailWorkflow(container()).run({
          input: { language: "de" },
          throwOnError: false,
        })

        expect(errors[0].error.message).toBe("boom")
        expect(await service.listTelegramSettings()).toHaveLength(0)
      })

      it("restores the previous values when the workflow fails", async () => {
        await updateTelegramSettingsWorkflow(container()).run({
          input: { enabled_events: ["order.placed"], language: "ka" },
        })

        await upsertThenFailWorkflow(container()).run({
          input: { enabled_events: [], language: "de", include_contact_details: false },
          throwOnError: false,
        })

        const [row] = await service.listTelegramSettings()
        expect(row.enabled_events).toEqual(["order.placed"])
        expect(row.language).toBe("ka")
        expect(row.include_contact_details).toBe(true)
      })
    })
  },
})
