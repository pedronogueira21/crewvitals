import { sourceOf } from '../content/evidence'
import type { Statement } from '../content/evidence'

/** NASA statements from evidence.json, each with its source link. */
export default function SourcedList({ statements }: { statements: Statement[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {statements.map((s) => {
        const source = sourceOf(s)
        return (
          <li key={s.text} className="border-l-2 border-line pl-3">
            <p>{s.text}</p>
            {source && (
              <p className="mt-1 text-sm text-muted">
                Source:{' '}
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  {source.title}
                </a>
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
