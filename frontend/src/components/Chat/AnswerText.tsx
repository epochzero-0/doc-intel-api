import { Fragment, type ReactNode } from 'react'

// The prompt asks the model to list filenames under a trailing "Sources:" heading.
// The UI shows sources as a list of its own, so drop that block from the prose.
function stripSourcesBlock(text: string) {
  return text.replace(/\n+\s*(\*\*|#+\s*)?sources?:?(\*\*)?\s*\n[\s\S]*$/i, '').trim()
}

const CITATION = /(\[\d+(?:\s*,\s*\d+)*\])/
const SENTENCE_END = /[.!?:]\s|\n/g

function lastBoundary(text: string) {
  let end = 0
  for (const m of text.matchAll(SENTENCE_END)) end = (m.index ?? 0) + m[0].length
  return end
}

type Props = {
  text: string
  // label for citation n (1-based); omit to render citations as plain markers
  citationLabel?: (n: number) => string
  onCitation?: (n: number) => void
  sweep?: boolean
}

// Each sentence that ends in a citation gets the highlighter. [n] links to retrieved passage n.
export default function AnswerText({ text, citationLabel, onCitation, sweep = true }: Props) {
  const parts = stripSourcesBlock(text).split(CITATION)
  const out: ReactNode[] = []
  let marks = 0

  parts.forEach((part, i) => {
    if (CITATION.test(part)) {
      const nums = part.match(/\d+/g)!.map(Number)
      out.push(
        <sup key={i} className="ml-0.5 font-mono text-[0.7em] text-cite">
          {nums.map((n, j) => (
            <Fragment key={n}>
              {j > 0 && ','}
              {onCitation ? (
                <button
                  type="button"
                  onClick={() => onCitation(n)}
                  className="inline-block min-w-[1.5em] rounded-sm px-1 py-0.5 text-center underline decoration-cite/40 underline-offset-2 hover:bg-hl-soft"
                  aria-label={`Show passage ${n}${citationLabel ? `, ${citationLabel(n)}` : ''}`}
                  title={citationLabel?.(n)}
                >
                  {n}
                </button>
              ) : (
                <span className="px-0.5">{n}</span>
              )}
            </Fragment>
          ))}
        </sup>,
      )
      return
    }

    const next = parts[i + 1]
    if (!next || !CITATION.test(next)) {
      out.push(<Fragment key={i}>{part}</Fragment>)
      return
    }

    // The cited claim is the text since the previous sentence boundary.
    const cut = lastBoundary(part)
    const lead = part.slice(0, cut)
    const claim = part.slice(cut)
    const trimmed = claim.trimStart()
    out.push(<Fragment key={`${i}-lead`}>{lead + claim.slice(0, claim.length - trimmed.length)}</Fragment>)
    out.push(
      <mark
        key={`${i}-mark`}
        className={`mark ${sweep ? 'mark-sweep' : ''}`}
        style={sweep ? { animationDelay: `${150 + marks * 220}ms` } : undefined}
      >
        {trimmed.trimEnd()}
      </mark>,
    )
    marks += 1
  })

  return <p className="whitespace-pre-wrap">{out}</p>
}
