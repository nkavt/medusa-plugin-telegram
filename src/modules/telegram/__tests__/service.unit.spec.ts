import TelegramModuleService, { TelegramApiError } from "../service"
import { DEFAULT_ENABLED_EVENTS, TelegramPluginOptions } from "../types"

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any

const createService = (options: TelegramPluginOptions = {}) =>
  new TelegramModuleService({ logger }, options)

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: "status text",
    json: async () => body,
  }) as Response

describe("TelegramModuleService", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock
  })

  describe("isConfigured", () => {
    it("requires both the bot token and chat ID", async () => {
      expect(await createService({ botToken: "t", chatId: 1 }).isConfigured()).toBe(true)
      expect(await createService({ botToken: "t" }).isConfigured()).toBe(false)
      expect(await createService({ chatId: 1 }).isConfigured()).toBe(false)
      expect(await createService().isConfigured()).toBe(false)
    })
  })

  describe("sendMessage", () => {
    const service = createService({ botToken: "123:abc", chatId: -100 })

    it("posts the message to the Bot API with HTML parse mode", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ok: true, result: {} }))

      await service.sendMessage("<b>Hi</b>")

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("https://api.telegram.org/bot123:abc/sendMessage")
      expect(init.method).toBe("POST")
      expect(JSON.parse(init.body)).toEqual({
        chat_id: -100,
        text: "<b>Hi</b>",
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      })
      expect(init.signal).toBeDefined()
    })

    it("throws Telegram's error description and code", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, { ok: false, error_code: 400, description: "Bad Request: chat not found" })
      )

      const error = await service.sendMessage("x").catch((e) => e)

      expect(error).toBeInstanceOf(TelegramApiError)
      expect(error.message).toBe("Telegram API error 400: Bad Request: chat not found")
      expect(error.errorCode).toBe(400)
    })

    it("uses the HTTP status when the response is not JSON", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: async () => {
          throw new SyntaxError("Unexpected token")
        },
      })

      await expect(service.sendMessage("x")).rejects.toThrow(
        "Telegram API error 502: Bad Gateway"
      )
    })

    it("reports network failures", async () => {
      fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.telegram.org"))

      await expect(service.sendMessage("x")).rejects.toThrow(
        "Could not reach the Telegram API: getaddrinfo ENOTFOUND api.telegram.org"
      )
    })

    it("reports timeouts", async () => {
      const timeout = new Error("The operation was aborted due to timeout")
      timeout.name = "TimeoutError"
      fetchMock.mockRejectedValue(timeout)

      await expect(service.sendMessage("x")).rejects.toThrow(
        "Could not reach the Telegram API: request timed out after 10000ms"
      )
    })

    it("does not call Telegram when not configured", async () => {
      await expect(createService().sendMessage("x")).rejects.toThrow(
        "Telegram is not configured"
      )
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe("getSettings", () => {
    const withStored = (stored: unknown[], options: TelegramPluginOptions = {}) => {
      const service = createService(options)
      jest.spyOn(service, "listTelegramSettings").mockResolvedValue(stored as any)
      return service
    }

    it("returns defaults when nothing is saved", async () => {
      expect(await withStored([]).getSettings()).toEqual({
        id: null,
        enabled_events: DEFAULT_ENABLED_EVENTS,
        language: "en",
        admin_url: null,
        include_contact_details: true,
      })
    })

    it("returns saved settings", async () => {
      const settings = await withStored([
        {
          id: "tgset_1",
          enabled_events: ["order.placed"],
          language: "ka",
          admin_url: "https://shop.example.com/app",
          include_contact_details: false,
        },
      ]).getSettings()

      expect(settings).toEqual({
        id: "tgset_1",
        enabled_events: ["order.placed"],
        language: "ka",
        admin_url: "https://shop.example.com/app",
        include_contact_details: false,
      })
    })

    it("drops unknown events and languages", async () => {
      const settings = await withStored([
        { id: "tgset_1", enabled_events: ["order.placed", "product.created"], language: "xx" },
      ]).getSettings()

      expect(settings.enabled_events).toEqual(["order.placed"])
      expect(settings.language).toBe("en")
    })

    it("falls back to the adminUrl plugin option", async () => {
      const settings = await withStored([], {
        adminUrl: "https://fallback.example.com/app",
      }).getSettings()

      expect(settings.admin_url).toBe("https://fallback.example.com/app")
    })
  })
})
