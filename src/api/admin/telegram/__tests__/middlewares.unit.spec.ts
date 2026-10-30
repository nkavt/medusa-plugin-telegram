import { UpdateTelegramSettingsSchema } from "../middlewares"

describe("UpdateTelegramSettingsSchema", () => {
  it("accepts a full valid payload", () => {
    const payload = {
      enabled_events: ["order.placed", "customer.created"],
      language: "ka",
      admin_url: "https://shop.example.com/app",
      include_contact_details: false,
    }

    expect(UpdateTelegramSettingsSchema.parse(payload)).toEqual(payload)
  })

  it("accepts partial updates and a null admin URL", () => {
    expect(UpdateTelegramSettingsSchema.safeParse({}).success).toBe(true)
    expect(UpdateTelegramSettingsSchema.safeParse({ admin_url: null }).success).toBe(true)
  })

  it.each([
    ["unknown event", { enabled_events: ["product.created"] }],
    ["unknown language", { language: "xx" }],
    ["non-URL admin URL", { admin_url: "not a url" }],
    ["non-http admin URL", { admin_url: "javascript:alert(1)" }],
    ["non-boolean contact flag", { include_contact_details: "yes" }],
  ])("rejects %s", (_, payload) => {
    expect(UpdateTelegramSettingsSchema.safeParse(payload).success).toBe(false)
  })
})
