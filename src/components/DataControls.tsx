import { useState } from 'react'
import { useStore } from '../state/store'

const quietButton = 'rounded-md border border-control px-3 py-1.5 text-sm text-ink hover:bg-raised'

/** "Load demo mission" and "Clear data". Both ask first when they would delete check-ins. */
export default function DataControls() {
  const { entries, loadDemo, clearData } = useStore()
  const [confirming, setConfirming] = useState<'demo' | 'clear' | null>(null)
  const [error, setError] = useState<string>()
  const count = entries.length
  const stored = count === 1 ? 'your 1 check-in' : `all ${count} check-ins`

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
    <section aria-label="Stored data" className="flex flex-wrap items-center gap-3 text-sm text-muted">
      {confirming ? (
        <>
          <p role="alert" className="text-ink">
            {confirming === 'demo'
              ? `Replace ${stored} with a 30-day simulated demo mission? This cannot be undone.`
              : `Delete ${stored} and restart the mission today? This cannot be undone.`}
          </p>
          <button type="button" className={quietButton} onClick={() => run(confirming)}>
            {confirming === 'demo' ? 'Load demo mission' : 'Delete data'}
          </button>
          <button type="button" className={quietButton} onClick={() => setConfirming(null)}>
            Keep data
          </button>
        </>
      ) : (
        <>
          <p>
            {count === 0
              ? 'No check-ins stored in this browser.'
              : `${count === 1 ? '1 check-in is' : `${count} check-ins are`} stored in this browser.`}
          </p>
          <button
            type="button"
            className={quietButton}
            onClick={() => (count === 0 ? run('demo') : setConfirming('demo'))}
          >
            Load demo mission
          </button>
          {count > 0 && (
            <button type="button" className={quietButton} onClick={() => setConfirming('clear')}>
              Clear data
            </button>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="basis-full text-alert">
          {error}
        </p>
      )}
    </section>
  )
}
