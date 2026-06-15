import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '../styles.css?url'
import { AppShell } from '#/components/AppShell'
import { Button } from '#/components/ui/button'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { getCompanyProfile } from '#/server/settings.fn'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'Ledger.' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  // Root loader so every page has the company profile available for the
  // sidebar without each route having to fetch it. Tolerates a missing row
  // (fresh install, broken seed) by returning null instead of throwing.
  loader: async () => {
    try {
      const profile = await getCompanyProfile()
      return { profile: { businessName: profile.businessName, email: profile.email } }
    } catch {
      return { profile: null }
    }
  },
  component: RootComponent,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="mt-24 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  )
}

function RootComponent() {
  const { profile } = Route.useLoaderData()
  return (
    <RootDocument>
      <TooltipProvider>
        <AppShell profile={profile}>
          <Outlet />
        </AppShell>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
