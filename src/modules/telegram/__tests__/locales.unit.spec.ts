import fs from "fs"
import path from "path"
import { LANGUAGES } from "../messages/languages"
import { locales } from "../messages/locales"
import { TELEGRAM_EVENTS } from "../types"

const ADMIN_I18N_DIR = path.join(__dirname, "../../../admin/i18n")

const flattenKeys = (obj: Record<string, unknown>, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? flattenKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  )

const readAdminLocale = (code: string) =>
  JSON.parse(fs.readFileSync(path.join(ADMIN_I18N_DIR, "json", `${code}.json`), "utf8"))

const codes = LANGUAGES.map((l) => l.code)

describe("message locales", () => {
  it("has a message file for every language", () => {
    expect(Object.keys(locales).sort()).toEqual([...codes].sort())
  })

  it.each(codes)("%s has every key filled in", (code) => {
    const keys = Object.keys(locales.en)
    expect(Object.keys(locales[code]).sort()).toEqual([...keys].sort())

    for (const key of keys) {
      expect(locales[code][key as keyof (typeof locales)["en"]].trim()).not.toBe("")
    }
  })

  it.each(codes)("%s order titles contain the {{id}} placeholder", (code) => {
    for (const event of TELEGRAM_EVENTS.filter((e) => e.startsWith("order."))) {
      const key = event.replace(".", "_") as keyof (typeof locales)["en"]
      expect(locales[code][key]).toContain("{{id}}")
    }
  })

  it("has valid Intl locales for currency formatting", () => {
    for (const { intl } of LANGUAGES) {
      expect(() => new Intl.NumberFormat(intl)).not.toThrow()
    }
  })
})

describe("admin locales", () => {
  const enKeys = flattenKeys(readAdminLocale("en")).sort()

  it.each(codes)("%s has the same keys as English", (code) => {
    expect(flattenKeys(readAdminLocale(code)).sort()).toEqual(enKeys)
  })

  it("has a label for every event", () => {
    const labels = readAdminLocale("en").events.labels
    expect(Object.keys(labels).sort()).toEqual(
      TELEGRAM_EVENTS.map((e) => e.replace(".", "_")).sort()
    )
  })

  it("registers every language in the admin i18n index", () => {
    const index = fs.readFileSync(path.join(ADMIN_I18N_DIR, "index.ts"), "utf8")

    for (const code of codes) {
      expect(index).toContain(`${code}: { telegram: ${code} }`)
    }
  })
})
