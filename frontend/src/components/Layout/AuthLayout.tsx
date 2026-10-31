import type { ReactNode } from 'react'
import Logo from '../ui/Logo'

export default function AuthLayout({ title, lede, children, footer }: { title: string; lede: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-page items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto grid w-full max-w-sm gap-8 px-4 pb-16 pt-8 sm:pt-16">
        <div className="grid gap-2">
          <h1 className="font-serif text-title font-medium">{title}</h1>
          <p className="text-muted">{lede}</p>
        </div>
        {children}
        <p className="border-t border-line pt-6 text-sm text-muted">{footer}</p>
      </main>
    </div>
  )
}
