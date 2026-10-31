const STOPWORDS = new Set(
  'a an and are as at be by can do does for from has have how i in is it its of on or that the this to was what when where which who why will with you your'.split(' '),
)

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Marks words from the question inside a retrieved passage. This is plain string matching to help
// the eye; it plays no part in how the passage was ranked.
export default function Highlighted({ text, query }: { text: string; query: string }) {
  const terms = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
    ),
  )
  if (terms.length === 0) return <>{text}</>

  const pattern = new RegExp(`(${terms.map(escape).join('|')})`, 'gi')
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-hl-soft px-px text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}
