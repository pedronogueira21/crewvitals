import { useLang } from '../i18n/LangProvider'
import { useStudies } from '../lib/api'
import type { StudyKeyword } from '../lib/nasa'
import DataModeTag from './DataModeTag'

/**
 * OSDR search results for one fixed keyword (SPEC 6.2). Study titles, organism
 * and project type come from OSDR and stay as OSDR gives them (in English).
 */
export default function RelatedStudies({ term, topic }: { term: StudyKeyword; topic: string }) {
  const loaded = useStudies(term)
  const { t, num } = useLang()

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">{topic}</span>
          <span className="text-muted">{t.studies.keyword(term)}</span>
        </p>
        {loaded.state === 'ready' && <DataModeTag mode={loaded.result.mode} retrieved={loaded.result.retrieved} />}
      </div>

      {loaded.state === 'loading' && <p className="text-sm text-muted">{t.studies.loading}</p>}
      {loaded.state === 'error' && <p className="text-sm text-muted">{t.studies.unavailable}</p>}
      {loaded.state === 'ready' &&
        (loaded.result.data.studies.length === 0 ? (
          <p className="text-sm text-muted">{t.studies.none}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {loaded.result.data.studies.map((s) => (
                <li key={s.accession} className="text-sm">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" lang="en" className="text-accent underline">
                    {s.title}
                  </a>
                  <span className="block text-xs text-muted">
                    {s.accession} · {s.organism || t.studies.organismNotStated} ·{' '}
                    <span lang={s.projectType ? 'en' : undefined}>{s.projectType || t.studies.typeNotStated}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              {t.studies.showing(num(loaded.result.data.studies.length), num(loaded.result.data.total))}
            </p>
          </>
        ))}
    </div>
  )
}
