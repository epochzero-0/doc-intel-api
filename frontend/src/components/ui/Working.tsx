// A quiet "busy" line: three pulsing dots and what is happening, read out to screen readers.
export default function Working({ children }: { children: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted">
      <span aria-hidden className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse [animation-delay:200ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse [animation-delay:400ms]" />
      </span>
      {children}
    </p>
  )
}
