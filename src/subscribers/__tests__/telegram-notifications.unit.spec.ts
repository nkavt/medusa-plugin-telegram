import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TELEGRAM_MODULE } from "../../modules/telegram"
import { TelegramSettingsData } from "../../modules/telegram/types"
import telegramNotificationsHandler, { config } from "../telegram-notifications"

const defaultSettings: TelegramSettingsData = {
  enabled_events: ["customer.created", "order.placed", "order.return_requested"],
  language: "en",
  admin_url: "https://shop.example.com/app",
  include_contact_details: true,
}

const order = {
  id: "order_123",
  display_id: 1042,
  email: "john@example.com",
  currency_code: "usd",
  total: 99,
  customer: { first_name: "John", last_name: "Doe", email: "john@example.com", phone: "123" },
}

const setup = ({
  configured = true,
  settings = defaultSettings,
  graphData = [order] as unknown[],
} = {}) => {
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() }
  const telegram = {
    isConfigured: jest.fn().mockResolvedValue(configured),
    getSettings: jest.fn().mockResolvedValue(settings),
    sendMessage: jest.fn().mockResolvedValue(undefined),
  }
  const query = { graph: jest.fn().mockResolvedValue({ data: graphData }) }

  const container = {
    resolve: jest.fn((key: string) => {
      switch (key) {
        case ContainerRegistrationKeys.LOGGER:
          return logger
        case ContainerRegistrationKeys.QUERY:
          return query
        case TELEGRAM_MODULE:
          return telegram
        default:
          throw new Error(`unexpected resolve: ${key}`)
      }
    }),
  }

  const run = (name: string, data: Record<string, unknown>) =>
    telegramNotificationsHandler({
      event: { name, data },
      container,
    } as any)

  return { logger, telegram, query, run }
}

describe("telegram-notifications subscriber", () => {
  it("subscribes to every supported event", () => {
    expect(config.event).toEqual([
      "customer.created",
      "order.placed",
      "order.canceled",
      "order.completed",
      "order.fulfillment_created",
      "order.return_requested",
      "order.return_received",
    ])
  })

  it("sends an order message for an enabled event", async () => {
    const { telegram, query, run } = setup()

    await run("order.placed", { id: "order_123" })

    expect(query.graph).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "order", filters: { id: "order_123" } })
    )
    const message = telegram.sendMessage.mock.calls[0][0]
    expect(message).toContain("New order #1042")
    expect(message).toContain("Email: john@example.com")
    expect(message).toContain("/app/orders/order_123")
  })

  it("uses order_id for return and fulfillment payloads", async () => {
    const { query, telegram, run } = setup()

    await run("order.return_requested", { order_id: "order_123", return_id: "ret_1" })

    expect(query.graph).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { id: "order_123" } })
    )
    expect(telegram.sendMessage.mock.calls[0][0]).toContain("Return requested for order #1042")
  })

  it("sends a customer message on registration", async () => {
    const { query, telegram, run } = setup({
      graphData: [{ id: "cus_1", first_name: "John", last_name: "Doe", email: "j@x.com" }],
    })

    await run("customer.created", { id: "cus_1" })

    expect(query.graph).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "customer", filters: { id: "cus_1" } })
    )
    expect(telegram.sendMessage.mock.calls[0][0]).toContain("New customer registered")
  })

  it("respects the contact details setting", async () => {
    const { telegram, run } = setup({
      settings: { ...defaultSettings, include_contact_details: false },
    })

    await run("order.placed", { id: "order_123" })

    const message = telegram.sendMessage.mock.calls[0][0]
    expect(message).not.toContain("Email:")
    expect(message).not.toContain("Phone:")
  })

  it("uses the configured message language", async () => {
    const { telegram, run } = setup({ settings: { ...defaultSettings, language: "ka" } })

    await run("order.placed", { id: "order_123" })

    expect(telegram.sendMessage.mock.calls[0][0]).toContain("ახალი შეკვეთა №1042")
  })

  it("skips disabled events", async () => {
    const { telegram, query, run } = setup()

    await run("order.completed", { id: "order_123" })

    expect(query.graph).not.toHaveBeenCalled()
    expect(telegram.sendMessage).not.toHaveBeenCalled()
  })

  it("does nothing when the plugin is not configured", async () => {
    const { telegram, run } = setup({ configured: false })

    await run("order.placed", { id: "order_123" })

    expect(telegram.getSettings).not.toHaveBeenCalled()
    expect(telegram.sendMessage).not.toHaveBeenCalled()
  })

  it("logs instead of throwing when Telegram fails", async () => {
    const { telegram, logger, run } = setup()
    telegram.sendMessage.mockRejectedValue(new Error("Telegram API error 403: Forbidden"))

    await expect(run("order.placed", { id: "order_123" })).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalledWith(
      `[telegram] Failed to send "order.placed" notification for order_123: Telegram API error 403: Forbidden`
    )
  })

  it("logs when the order no longer exists", async () => {
    const { telegram, logger, run } = setup({ graphData: [] })

    await run("order.placed", { id: "order_gone" })

    expect(telegram.sendMessage).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("order order_gone not found"))
  })

  it("logs when the payload has no ID", async () => {
    const { telegram, logger, run } = setup()

    await run("order.placed", {})

    expect(telegram.sendMessage).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("event payload has no entity ID"))
  })
})
