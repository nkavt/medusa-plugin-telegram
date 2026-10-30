import { defineMiddlewares } from "@medusajs/framework/http"
import { telegramMiddlewares } from "./admin/telegram/middlewares"

export default defineMiddlewares({
  routes: [...telegramMiddlewares],
})
