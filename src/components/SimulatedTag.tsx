import { useLang } from '../i18n/LangProvider'

/** Shown on every card, chart and summary that displays simulated entries. */
export default function SimulatedTag() {
  const { t } = useLang()
  return (
    <p className="self-start rounded-sm border border-line px-2 py-0.5 text-xs text-muted">{t.simulated}</p>
  )
}
