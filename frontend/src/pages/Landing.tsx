import Logo from '../components/ui/Logo'
import { ButtonLink } from '../components/ui/Button'
import AnswerText from '../components/Chat/AnswerText'
import Highlighted from '../components/Passages/Highlighted'
import { useAuth } from '../hooks/useAuth'

const REPO = 'https://github.com/epochzero-0/doc-intel-api'

const example = {
  file: 'lease-agreement-2026.pdf',
  question: 'What is the notice period for ending the lease?',
  answer:
    "Either party can end the lease with 60 days' written notice [1]. Notice served before the 1st of a month counts from the start of the next month [2].",
  passages: [
    { chunk: 14, text: "Either party may terminate this agreement by giving not less than 60 days' written notice to the other party." },
    { chunk: 15, text: 'Notice received before the first day of a month runs from the first day of the following month.' },
    { chunk: 31, text: 'Any notice under this agreement must be delivered in writing to the address in Schedule 1.' },
  ],
}

const steps = [
  {
    title: 'Upload',
    body: 'PDF, DOCX or TXT. The text is pulled out and cut into 800-character chunks that overlap by 100, so a sentence split at one boundary is whole in the next chunk.',
  },
  {
    title: 'Embed',
    body: 'Each chunk becomes a vector with OpenAI text-embedding-3-small and is stored in Postgres with pgvector.',
  },
  {
    title: 'Retrieve',
    body: 'Your question is embedded the same way. The chunks closest to it by cosine distance come back in rank order, and you see them.',
  },
  {
    title: 'Answer',
    body: "GPT-4o writes from the three closest chunks, plus the document's opening when you ask about one document, and cites each by number. If they don't hold the answer, it says so.",
  },
]

export default function Landing() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <a href={REPO} className="hidden rounded px-3 py-2 text-sm text-muted hover:text-ink sm:inline-block">
            GitHub
          </a>
          {isAuthenticated ? (
            <ButtonLink to="/app" size="sm">
              Open the app
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="quiet" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink to="/register" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-page gap-12 px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-28">
          <div className="grid gap-6">
            <p className="font-mono text-label uppercase text-muted">Questions over your own documents</p>
            <h1 className="font-serif text-display font-medium">
              Ask your documents. <em className="mark mark-sweep font-normal [animation-delay:300ms]">See the passage</em>{' '}
              behind every answer.
            </h1>
            <p className="max-w-prose text-lg text-muted">
              Upload PDFs, Word files and text. Every answer cites the chunks it was written from, and you can read
              those chunks before you trust it.
            </p>
            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <ButtonLink to="/app" size="lg">
                  Open the app
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/register" size="lg">
                    Create an account
                  </ButtonLink>
                  <ButtonLink to="/login" size="lg" variant="ghost">
                    Sign in
                  </ButtonLink>
                </>
              )}
            </div>
          </div>

          <figure className="min-w-0 rounded border border-line bg-paper">
            <figcaption className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <span className="truncate font-mono text-xs text-muted">{example.file}</span>
              <span className="font-mono text-label uppercase text-muted">Example</span>
            </figcaption>
            <div className="grid gap-4 p-4 sm:p-5">
              <p className="justify-self-end rounded bg-surface-2 px-3 py-2 text-sm">{example.question}</p>
              <div className="font-serif text-answer">
                <AnswerText text={example.answer} />
              </div>
              <div className="grid gap-2 border-t border-line pt-4">
                <p className="font-mono text-label uppercase text-muted">Retrieved, in rank order</p>
                <ol className="grid gap-2">
                  {example.passages.map((p, i) => (
                    <li key={p.chunk} className="grid grid-cols-[1.25rem_1fr] gap-x-2 text-sm">
                      <span className="pt-px font-mono text-xs text-muted">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block font-mono text-xs text-muted">chunk {p.chunk}</span>
                        <Highlighted text={p.text} query={example.question} />
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </figure>
        </section>

        <section className="border-t border-line" aria-labelledby="how">
          <div className="mx-auto grid max-w-page gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.6fr_1.4fr] lg:py-24">
            <div className="grid content-start gap-3">
              <h2 id="how" className="font-serif text-title font-medium">
                What happens to a question
              </h2>
              <p className="max-w-prose text-muted">
                Four steps, and the third one is on screen: the passages panel shows what the search returned before
                you read the answer.
              </p>
            </div>
            <ol className="grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-2">
              {steps.map((s, i) => (
                <li key={s.title} className="grid content-start gap-2 bg-paper p-5">
                  <span className="font-mono text-xs text-muted">{i + 1}</span>
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-line" aria-labelledby="modes">
          <div className="mx-auto grid max-w-page gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.6fr_1.4fr] lg:py-24">
            <h2 id="modes" className="font-serif text-title font-medium">
              Two ways to ask
            </h2>
            <dl className="grid gap-8 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                <dt className="font-medium">Answer</dt>
                <dd className="text-muted">
                  A written answer with citations, next to the passages it came from. Click a citation to jump to its
                  passage.
                </dd>
              </div>
              <div className="grid content-start gap-2">
                <dt className="font-medium">Passages only</dt>
                <dd className="text-muted">
                  The search results and nothing else. No model writes anything, so it is fast and you read the source
                  text directly.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <span>FastAPI on AWS, Postgres with pgvector, React on Vercel.</span>
          <a href={REPO} className="rounded underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink">
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
