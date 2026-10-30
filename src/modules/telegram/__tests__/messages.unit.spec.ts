import {
  buildCustomerMessage,
  buildOrderMessage,
  buildTestMessage,
  escapeHtml,
  formatMoney,
  isSupportedLanguage,
  MessageOrder,
} from "../messages"

// Intl may use (narrow) no-break spaces depending on the ICU version
const normalizeSpaces = (value: string | null) => value?.replace(/\s/g, " ")

const order: MessageOrder = {
  id: "order_123",
  display_id: 1042,
  email: "john@example.com",
  currency_code: "usd",
  total: 120.5,
  customer: {
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    phone: "+1 555 0100",
  },
}

describe("escapeHtml", () => {
  it("escapes characters Telegram's HTML parse mode treats as markup", () => {
    expect(escapeHtml(`<b>"Tom" & Jerry</b>`)).toBe(
      "&lt;b&gt;&quot;Tom&quot; &amp; Jerry&lt;/b&gt;"
    )
  })

  it("returns an empty string for null and undefined", () => {
    expect(escapeHtml(null)).toBe("")
    expect(escapeHtml(undefined)).toBe("")
  })
})

describe("formatMoney", () => {
  it("formats amounts in the order currency and message locale", () => {
    expect(formatMoney(120.5, "usd", "en")).toBe("$120.50")
    expect(normalizeSpaces(formatMoney(120.5, "gel", "ka"))).toBe("120,50 ₾")
  })

  it("does not divide amounts by 100", () => {
    expect(formatMoney(49.99, "usd", "en")).toBe("$49.99")
  })

  it("accepts BigNumber-like values from Query", () => {
    expect(formatMoney({ numeric: 10 }, "usd", "en")).toBe("$10.00")
  })

  it("returns null when there is no amount", () => {
    expect(formatMoney(null, "usd", "en")).toBeNull()
    expect(formatMoney(undefined, "usd", "en")).toBeNull()
  })

  it("falls back to plain text for unknown currency codes", () => {
    expect(formatMoney(5, "notacurrency", "en")).toBe("5 NOTACURRENCY")
  })
})

describe("isSupportedLanguage", () => {
  it("accepts dashboard locales and Georgian", () => {
    expect(isSupportedLanguage("en")).toBe(true)
    expect(isSupportedLanguage("ptBR")).toBe(true)
    expect(isSupportedLanguage("ka")).toBe(true)
  })

  it("rejects unknown codes", () => {
    expect(isSupportedLanguage("xx")).toBe(false)
  })
})

describe("buildOrderMessage", () => {
  it("includes title, customer, contact details, total and admin link", () => {
    const message = buildOrderMessage("order.placed", order, {
      language: "en",
      adminUrl: "https://shop.example.com/app",
    })

    expect(message).toBe(
      [
        "🛒 <b>New order #1042</b>",
        "",
        "Customer: John Doe",
        "Email: john@example.com",
        "Phone: +1 555 0100",
        "Total: $120.50",
        `🔗 <a href="https://shop.example.com/app/orders/order_123">Open in admin</a>`,
      ].join("\n")
    )
  })

  it.each([
    ["order.canceled", "Order #1042 was canceled"],
    ["order.completed", "Order #1042 was completed"],
    ["order.fulfillment_created", "Order #1042 was fulfilled"],
    ["order.return_requested", "Return requested for order #1042"],
    ["order.return_received", "Return received for order #1042"],
  ] as const)("uses the right title for %s", (event, title) => {
    expect(buildOrderMessage(event, order, { language: "en" })).toContain(
      `<b>${title}</b>`
    )
  })

  it("leaves out email and phone when contact details are disabled", () => {
    const message = buildOrderMessage("order.placed", order, {
      language: "en",
      includeContactDetails: false,
    })

    expect(message).toContain("Customer: John Doe")
    expect(message).not.toContain("Email:")
    expect(message).not.toContain("Phone:")
    expect(message).toContain("Total: $120.50")
  })

  it("uses the shipping address for guest orders", () => {
    const message = buildOrderMessage(
      "order.placed",
      {
        ...order,
        customer: null,
        shipping_address: { first_name: "Jane", last_name: "Roe", phone: "123" },
      },
      { language: "en" }
    )

    expect(message).toContain("Customer: Jane Roe")
    expect(message).toContain("Email: john@example.com")
    expect(message).toContain("Phone: 123")
  })

  it("shows the guest label when no name is known", () => {
    const message = buildOrderMessage(
      "order.placed",
      { id: "order_1", display_id: 1, currency_code: "usd", total: 1 },
      { language: "en" }
    )

    expect(message).toContain("Customer: Guest")
  })

  it("escapes customer-provided values", () => {
    const message = buildOrderMessage(
      "order.placed",
      { ...order, customer: { first_name: "<script>", last_name: "&" } },
      { language: "en" }
    )

    expect(message).toContain("Customer: &lt;script&gt; &amp;")
  })

  it("sends localhost admin links as plain text", () => {
    const message = buildOrderMessage("order.placed", order, {
      language: "en",
      adminUrl: "http://localhost:9000/app/",
    })

    expect(message).toContain("🔗 http://localhost:9000/app/orders/order_123")
    expect(message).not.toContain("<a href")
  })

  it("omits the link when no admin URL is known", () => {
    const message = buildOrderMessage("order.placed", order, { language: "en" })

    expect(message).not.toContain("🔗")
  })

  it("translates labels and uses № for Georgian", () => {
    const message = buildOrderMessage(
      "order.placed",
      { ...order, currency_code: "gel" },
      { language: "ka" }
    )

    expect(message).toContain("<b>ახალი შეკვეთა №1042</b>")
    expect(message).toContain("მომხმარებელი: John Doe")
    expect(normalizeSpaces(message)).toContain("ჯამური თანხა: 120,50 ₾")
  })

  it("falls back to English for unknown languages", () => {
    expect(buildOrderMessage("order.placed", order, { language: "xx" })).toContain(
      "<b>New order #1042</b>"
    )
  })
})

describe("buildCustomerMessage", () => {
  const customer = {
    id: "cus_123",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    phone: "+1 555 0100",
  }

  it("includes name, contact details and customer link", () => {
    expect(
      buildCustomerMessage(customer, {
        language: "en",
        adminUrl: "https://shop.example.com/app",
      })
    ).toBe(
      [
        "👤 <b>New customer registered</b>",
        "",
        "Customer: John Doe",
        "Email: john@example.com",
        "Phone: +1 555 0100",
        `🔗 <a href="https://shop.example.com/app/customers/cus_123">Open in admin</a>`,
      ].join("\n")
    )
  })

  it("leaves out email and phone when contact details are disabled", () => {
    const message = buildCustomerMessage(customer, {
      language: "en",
      includeContactDetails: false,
    })

    expect(message).toContain("Customer: John Doe")
    expect(message).not.toContain("Email:")
    expect(message).not.toContain("Phone:")
  })
})

describe("buildTestMessage", () => {
  it("is translated", () => {
    expect(buildTestMessage("en")).toContain("Telegram notifications are working!")
    expect(buildTestMessage("ka")).toContain("Medusa მაღაზიიდან")
  })
})
