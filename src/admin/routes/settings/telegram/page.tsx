import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight, Spinner } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  StatusBadge,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  detectAdminUrl,
  eventKey,
  fetchTelegramSettings,
  saveTelegramSettings,
  sendTelegramTestMessage,
  TELEGRAM_NS,
  TelegramSettings,
  telegramSettingsQueryKey,
} from "../../../lib/telegram"

const TelegramSettingsPage = () => {
  const { t, i18n } = useTranslation(TELEGRAM_NS)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: telegramSettingsQueryKey,
    queryFn: fetchTelegramSettings,
  })

  const [form, setForm] = useState<TelegramSettings | null>(null)

  useEffect(() => {
    if (!data) {
      return
    }
    const { settings, persisted, languages } = data
    const adminLanguageSupported = languages.some((l) => l.code === i18n.language)

    // Before the first save, default to the admin's own language and the URL we're on
    setForm({
      ...settings,
      language:
        !persisted && adminLanguageSupported ? i18n.language : settings.language,
      admin_url: settings.admin_url ?? detectAdminUrl(),
    })
  }, [data, i18n.language])

  const saveMutation = useMutation({
    mutationFn: saveTelegramSettings,
    onSuccess: (response) => {
      queryClient.setQueryData(telegramSettingsQueryKey, response)
      toast.success(t("saved"))
    },
    onError: (error: Error) => {
      toast.error(t("saveFailed"), { description: error.message })
    },
  })

  const testMutation = useMutation({
    mutationFn: sendTelegramTestMessage,
    onSuccess: () => toast.success(t("connection.testSent")),
    onError: (error: Error) => {
      toast.error(t("connection.testFailed"), { description: error.message })
    },
  })

  if (isLoading || !data || !form) {
    return (
      <Container className="flex items-center justify-center px-6 py-4">
        <Spinner className="animate-spin text-ui-fg-subtle" />
      </Container>
    )
  }

  const toggleEvent = (event: string, enabled: boolean) => {
    setForm({
      ...form,
      enabled_events: enabled
        ? [...form.enabled_events, event]
        : form.enabled_events.filter((e) => e !== event),
    })
  }

  const handleSave = () => {
    saveMutation.mutate({
      enabled_events: form.enabled_events,
      language: form.language,
      admin_url: form.admin_url?.trim() || null,
      include_contact_details: form.include_contact_details,
    })
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h1">{t("title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("description")}
            </Text>
          </div>
          <StatusBadge color={data.configured ? "green" : "red"}>
            {data.configured
              ? t("connection.configured")
              : t("connection.notConfigured")}
          </StatusBadge>
        </div>
        <div className="flex items-center justify-between gap-x-4 px-6 py-4">
          <div>
            <Text size="small" leading="compact" weight="plus">
              {t("connection.title")}
            </Text>
            {!data.configured && (
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {t("connection.notConfiguredHint")}
              </Text>
            )}
          </div>
          <Button
            size="small"
            variant="secondary"
            disabled={!data.configured || testMutation.isPending}
            isLoading={testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            {t("connection.sendTest")}
          </Button>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">{t("events.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("events.description")}
          </Text>
        </div>
        {data.available_events.map((event) => (
          <div key={event} className="flex items-center justify-between px-6 py-4">
            <Label htmlFor={`telegram-${event}`} size="small" weight="plus">
              {t(`events.labels.${eventKey(event)}`)}
            </Label>
            <Switch
              id={`telegram-${event}`}
              checked={form.enabled_events.includes(event)}
              onCheckedChange={(checked) => toggleEvent(event, checked)}
            />
          </div>
        ))}
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between gap-x-4 px-6 py-4">
          <div>
            <Label htmlFor="telegram-contact-details" size="small" weight="plus">
              {t("contact.label")}
            </Label>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {t("contact.hint")}
            </Text>
          </div>
          <Switch
            id="telegram-contact-details"
            checked={form.include_contact_details}
            onCheckedChange={(checked) =>
              setForm({ ...form, include_contact_details: checked })
            }
          />
        </div>
        <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              {t("language.label")}
            </Label>
            <Select
              size="small"
              value={form.language}
              onValueChange={(language) => setForm({ ...form, language })}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {data.languages.map((language) => (
                  <Select.Item key={language.code} value={language.code}>
                    {language.display_name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {t("language.hint")}
            </Text>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="telegram-admin-url" size="small" weight="plus">
              {t("adminUrl.label")}
            </Label>
            <div className="flex gap-x-2">
              <Input
                id="telegram-admin-url"
                size="small"
                type="url"
                placeholder="https://example.com/app"
                value={form.admin_url ?? ""}
                onChange={(e) => setForm({ ...form, admin_url: e.target.value })}
              />
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={() => setForm({ ...form, admin_url: detectAdminUrl() })}
              >
                {t("adminUrl.detect")}
              </Button>
            </div>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {t("adminUrl.hint")}
            </Text>
          </div>
        </div>
        <div className="flex justify-end px-6 py-4">
          <Button
            size="small"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            isLoading={saveMutation.isPending}
          >
            {t("save")}
          </Button>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "title",
  translationNs: "telegram",
  icon: ChatBubbleLeftRight,
})

export default TelegramSettingsPage
