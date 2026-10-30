import validateOptionsLoader from "../loaders/validate-options"

describe("validateOptionsLoader", () => {
  const logger = { warn: jest.fn() } as any

  beforeEach(() => logger.warn.mockReset())

  it("warns about missing options", async () => {
    await validateOptionsLoader({ container: {} as any, logger, options: {} })

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Missing plugin option(s): botToken, chatId")
    )
  })

  it("names only the missing option", async () => {
    await validateOptionsLoader({ container: {} as any, logger, options: { botToken: "t" } })

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Missing plugin option(s): chatId.")
    )
  })

  it("stays quiet when configured", async () => {
    await validateOptionsLoader({
      container: {} as any,
      logger,
      options: { botToken: "t", chatId: 1 },
    })

    expect(logger.warn).not.toHaveBeenCalled()
  })
})
