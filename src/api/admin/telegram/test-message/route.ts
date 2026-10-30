import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { sendTelegramTestMessageWorkflow } from "../../../../workflows/send-telegram-test-message"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { result } = await sendTelegramTestMessageWorkflow(req.scope).run()

  res.json(result)
}
