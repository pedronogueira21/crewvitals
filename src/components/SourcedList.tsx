import { sourceOf, statementText } from '../content/evidence'
import type { Statement } from '../content/evidence'
import { useLang } from '../i18n/LangProvider'

/**
 * NASA statements from evidence.json, each with its source link. In Portuguese
 * the text is a translation of the team's English paraphrase; the caller shows
 * t.nasaText.listLabel above the list to say so.
 */
export default function SourcedList({ statements }: { statements: Statement[] }) {
  const { t, lang } = useLang()
  return (
    <ul className="flex flex-col gap-3">
      {statements.map((s) => {
        const source = sourceOf(s)
        return (
          <li key={s.text} className="border-l-2 border-line pl-3">
            <p>{statementText(s, lang)}</p>
            {source && (
              <p className="mt-1 text-sm text-muted">
                {t.nasaText.source}{' '}
                <a href={source.url} target="_blank" rel="noopener noreferrer" lang="en" className="text-accent underline">
                  {source.title}
                </a>
                {t.nasaText.sourceSuffix}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
