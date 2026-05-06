import { Link } from '@tanstack/react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Invoices' },
  { to: '/clients', label: 'Clients' },
  { to: '/settings', label: 'Settings' },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-8 px-6">
          <Link to="/" className="text-base font-semibold tracking-tight text-foreground">
            Invoices
          </Link>
          <nav className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
                activeProps={{ className: 'active text-foreground' }}
                activeOptions={{ exact: item.to === '/' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
