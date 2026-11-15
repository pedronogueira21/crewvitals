import { useState } from 'react'
import { useLang } from '../i18n/LangProvider'
import { storeErrorText, useStore } from '../state/store'
import type { StoreError } from '../state/store'

const quietButton = 'rounded-md border border-control px-3 py-1.5 text-sm text-ink hover:bg-raised'

/** "Load demo mission" and "Clear data". Both ask first when they would delete check-ins. */
export default function DataControls() {
  const { entries, loadDemo, clearData } = useStore()
  const { t, date } = useLang()
  const [confirming, setConfirming] = useState<'demo' | 'clear' | null>(null)
  const [error, setError] = useState<StoreError>()
  const count = entries.length
  const stored = t.data.yourCheckIns(count)

  function run(action: 'demo' | 'clear') {
    setConfirming(null)
    if (action === 'clear') {
      clearData()
      setError(undefined)
    } else {
      const result = loadDemo()
      setError(result.ok ? undefined : result.error)
    }
  }

  return (
    <section aria-label={t.data.label} className="flex flex-wrap items-center gap-3 text-sm text-muted">
      {confirming ? (
        <>
          <p role="alert" className="text-ink">
            {confirming === 'demo' ? t.data.confirmDemo(stored) : t.data.confirmClear(stored)}
          </p>
          <button type="button" className={quietButton} onClick={() => run(confirming)}>
            {confirming === 'demo' ? t.data.loadDemo : t.data.deleteData}
          </button>
          <button type="button" className={quietButton} onClick={() => setConfirming(null)}>
            {t.data.keepData}
          </button>
        </>
      ) : (
        <>
          <p>{count === 0 ? t.data.none : t.data.stored(count)}</p>
          <button
            type="button"
            className={quietButton}
            onClick={() => (count === 0 ? run('demo') : setConfirming('demo'))}
          >
            {t.data.loadDemo}
          </button>
          {count > 0 && (
            <button type="button" className={quietButton} onClick={() => setConfirming('clear')}>
              {t.data.clearData}
            </button>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="basis-full text-alert">
          {storeErrorText(error, t, date)}
        </p>
      )}
    </section>
  )
}
