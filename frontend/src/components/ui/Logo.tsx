import { Link } from 'react-router-dom'

export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="font-serif text-xl font-medium tracking-tight text-ink rounded-sm">
      Doc <span className="mark">Intel</span>
    </Link>
  )
}
