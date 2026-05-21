import { Link, useLocation } from '@tanstack/react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', match: (p: string) => p === '/' },
  { to: '/invoices', label: 'Invoices', match: (p: string) => p.startsWith('/invoices') },
  { to: '/clients', label: 'Clients', match: (p: string) => p.startsWith('/clients') },
  { to: '/settings', label: 'Settings', match: (p: string) => p.startsWith('/settings') },
] as const

type ProfileSummary = { businessName: string; email: string } | null

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode
  profile: ProfileSummary
}) {
  const { pathname } = useLocation()
  const businessName = profile?.businessName?.trim() || ''
  const email = profile?.email?.trim() || ''
  const showProfileBlock = Boolean(businessName || email)

  return (
    <div className="flex min-h-screen bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col justify-between border-r border-border bg-sidebar pt-7 pr-6 pb-6 pl-6">
        <div className="flex flex-col gap-9">
          <Link
            to="/"
            className="rounded-sm font-serif text-[24px] font-medium leading-none tracking-[-0.02em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ledger.
          </Link>
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.match(pathname)
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-sm px-2.5 py-2 text-[13px] leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isActive
                      ? 'font-semibold text-foreground'
                      : 'font-normal text-[var(--color-sidebar-muted)] hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        {showProfileBlock && (
          <Link
            to="/settings"
            className="flex items-center gap-2.5 rounded-sm border-t border-border pt-3.5 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {initialsFor(businessName || email)}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 leading-none">
              {businessName && (
                <span className="truncate text-[12px] font-medium text-foreground">
                  {businessName}
                </span>
              )}
              {email && <span className="truncate text-[11px] text-muted-foreground">{email}</span>}
            </div>
          </Link>
        )}
      </div>
      <main id="main-content" className="flex-1 px-10 py-16">
        {children}
      </main>
    </div>
  )
}
