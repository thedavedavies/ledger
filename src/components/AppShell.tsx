import { Link, useLocation } from '@tanstack/react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Invoices', match: (p: string) => p === '/' || p.startsWith('/invoices') },
  { to: '/clients', label: 'Clients', match: (p: string) => p.startsWith('/clients') },
  { to: '/settings', label: 'Settings', match: (p: string) => p.startsWith('/settings') },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-10 px-6">
          <Link
            to="/"
            className="font-serif text-lg italic tracking-tight text-foreground"
          >
            Invoice Software
          </Link>
          <nav className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  item.match(pathname) ? 'text-foreground' : 'text-muted-foreground'
                }`}
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
