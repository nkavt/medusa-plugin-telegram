import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { sendTelegramTestMessageStep } from "./steps/send-telegram-test-message"

export const sendTelegramTestMessageWorkflow = createWorkflow(
  "send-telegram-test-message",
  function () {
    const result = sendTelegramTestMessageStep()

    return new WorkflowResponse(result)
  }
)
