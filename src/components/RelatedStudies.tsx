import { useStudies } from '../lib/api'
import type { StudyKeyword } from '../lib/nasa'
import DataModeTag from './DataModeTag'

/** OSDR search results for one fixed keyword (SPEC 6.2). */
export default function RelatedStudies({ term, topic }: { term: StudyKeyword; topic: string }) {
  const loaded = useStudies(term)

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">{topic}</span>
          <span className="text-muted"> · keyword “{term}”</span>
        </p>
        {loaded.state === 'ready' && <DataModeTag mode={loaded.result.mode} retrieved={loaded.result.retrieved} />}
      </div>

      {loaded.state === 'loading' && <p className="text-sm text-muted">Loading studies…</p>}
      {loaded.state === 'error' && <p className="text-sm text-muted">Studies are unavailable right now.</p>}
      {loaded.state === 'ready' &&
        (loaded.result.data.studies.length === 0 ? (
          <p className="text-sm text-muted">No studies found.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {loaded.result.data.studies.map((s) => (
                <li key={s.accession} className="text-sm">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                    {s.title}
                  </a>
                  <span className="block text-xs text-muted">
                    {s.accession} · {s.organism} · {s.projectType}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              Showing {loaded.result.data.studies.length} of {loaded.result.data.total} search results.
            </p>
          </>
        ))}
    </div>
  )
}
