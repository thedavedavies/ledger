import { Link, useLocation } from '@tanstack/react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', match: (p: string) => p === '/' },
  { to: '/invoices', label: 'Invoices', match: (p: string) => p.startsWith('/invoices') },
  { to: '/clients', label: 'Clients', match: (p: string) => p.startsWith('/clients') },
  { to: '/settings', label: 'Settings', match: (p: string) => p.startsWith('/settings') },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col justify-between border-r border-border bg-sidebar pt-7 pr-6 pb-6 pl-6">
        <div className="flex flex-col gap-9">
          <Link
            to="/"
            className="font-serif text-[24px] font-medium leading-none tracking-[-0.02em] text-foreground"
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
                  className={`px-2.5 py-2 text-[13px] leading-none transition-colors ${
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
        <div className="flex items-center gap-2.5 border-t border-border pt-3.5 pb-0.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            EW
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-[12px] font-medium text-foreground">Eleanor Whitmore</span>
            <span className="text-[11px] text-muted-foreground">eleanor@whitmore.studio</span>
          </div>
        </div>
      </div>
      <main className="flex-1 px-10 py-16">{children}</main>
    </div>
  )
}
