import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { TELEGRAM_MODULE } from ".."
import TelegramSettings from "../models/telegram-settings"
import TelegramModuleService from "../service"
import { DEFAULT_ENABLED_EVENTS } from "../types"

jest.setTimeout(60 * 1000)

moduleIntegrationTestRunner<TelegramModuleService>({
  moduleName: TELEGRAM_MODULE,
  moduleModels: [TelegramSettings],
  resolve: "./src/modules/telegram",
  moduleOptions: {
    botToken: "123:test",
    chatId: -100,
    adminUrl: "https://fallback.example.com/app",
  },
  testSuite: ({ service }) => {
    describe("TelegramModuleService", () => {
      it("receives the plugin options", async () => {
        expect(await service.isConfigured()).toBe(true)
      })

      it("returns defaults before anything is saved", async () => {
        expect(await service.getSettings()).toEqual({
          id: null,
          enabled_events: DEFAULT_ENABLED_EVENTS,
          language: "en",
          admin_url: "https://fallback.example.com/app",
          include_contact_details: true,
        })
      })

      it("applies column defaults on create", async () => {
        const created = await service.createTelegramSettings({
          enabled_events: ["order.placed"],
        })

        expect(created.language).toBe("en")
        expect(created.include_contact_details).toBe(true)
        expect(created.admin_url).toBeNull()
        expect(created.id).toMatch(/^tgset_/)
      })

      it("reads back saved settings", async () => {
        const created = await service.createTelegramSettings({
          enabled_events: ["order.placed", "order.canceled"],
          language: "ka",
          admin_url: "https://shop.example.com/app",
          include_contact_details: false,
        })

        expect(await service.getSettings()).toEqual({
          id: created.id,
          enabled_events: ["order.placed", "order.canceled"],
          language: "ka",
          admin_url: "https://shop.example.com/app",
          include_contact_details: false,
        })
      })

      it("stores an empty event list as no notifications", async () => {
        await service.createTelegramSettings({ enabled_events: [] })

        expect((await service.getSettings()).enabled_events).toEqual([])
      })

      it("updates the stored row", async () => {
        const created = await service.createTelegramSettings({
          enabled_events: ["order.placed"],
        })

        await service.updateTelegramSettings({
          id: created.id,
          language: "de",
          include_contact_details: false,
        })

        const settings = await service.getSettings()
        expect(settings.language).toBe("de")
        expect(settings.include_contact_details).toBe(false)
        expect(settings.enabled_events).toEqual(["order.placed"])
      })
    })
  },
})
