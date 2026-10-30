import { Module } from "@medusajs/framework/utils"
import TelegramModuleService from "./service"
import validateOptionsLoader from "./loaders/validate-options"

export const TELEGRAM_MODULE = "telegram"

export default Module(TELEGRAM_MODULE, {
  service: TelegramModuleService,
  loaders: [validateOptionsLoader],
})

export * from "./types"
export { TelegramApiError } from "./service"
