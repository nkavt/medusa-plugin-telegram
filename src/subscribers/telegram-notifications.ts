import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { TELEGRAM_MODULE } from "../modules/telegram"
import {
  buildCustomerMessage,
  buildOrderMessage,
  MessageOrder,
} from "../modules/telegram/messages"
import type TelegramModuleService from "../modules/telegram/service"
import { TELEGRAM_EVENTS, TelegramEvent } from "../modules/telegram/types"

type EventPayload = {
  id?: string
  order_id?: string
}

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "total",
  "customer.first_name",
  "customer.last_name",
  "customer.email",
  "customer.phone",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
]

const CUSTOMER_FIELDS = ["id", "first_name", "last_name", "email", "phone"]

export default async function telegramNotificationsHandler({
  event: { name, data },
  container,
}: SubscriberArgs<EventPayload>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const eventName = name as TelegramEvent
  // Customer and most order events send `id`; fulfillment/return events send `order_id`
  const entityId = data.order_id ?? data.id

  try {
    const telegramService: TelegramModuleService = container.resolve(TELEGRAM_MODULE)

    if (!(await telegramService.isConfigured())) {
      return
    }

    const settings = await telegramService.getSettings()
    if (!settings.enabled_events.includes(eventName)) {
      return
    }

    if (!entityId) {
      logger.error(
        `[telegram] Failed to send "${eventName}" notification: event payload has no entity ID (${JSON.stringify(data)})`
      )
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const messageOptions = {
      language: settings.language,
      adminUrl: settings.admin_url,
      includeContactDetails: settings.include_contact_details,
    }
    let message: string

    if (eventName === "customer.created") {
      const {
        data: [customer],
      } = await query.graph({
        entity: "customer",
        fields: CUSTOMER_FIELDS,
        filters: { id: entityId },
      })
      if (!customer) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, `customer ${entityId} not found`)
      }
      message = buildCustomerMessage(customer, messageOptions)
    } else {
      const {
        data: [order],
      } = await query.graph({
        entity: "order",
        fields: ORDER_FIELDS,
        filters: { id: entityId },
      })
      if (!order) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, `order ${entityId} not found`)
      }
      message = buildOrderMessage(
        eventName,
        order as unknown as MessageOrder,
        messageOptions
      )
    }

    await telegramService.sendMessage(message)
  } catch (error) {
    // Never let a Telegram problem affect the store flow - log the reason and move on
    const reason = error instanceof Error ? error.message : String(error)
    logger.error(
      `[telegram] Failed to send "${eventName}" notification for ${entityId ?? "unknown entity"}: ${reason}`
    )
  }
}

export const config: SubscriberConfig = {
  event: [...TELEGRAM_EVENTS],
  context: {
    subscriberId: "telegram-notifications",
  },
}
