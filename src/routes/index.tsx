import { Link, createFileRoute } from '@tanstack/react-router'
import { getCompanyProfile } from '#/server/settings.fn'

export const Route = createFileRoute('/')({
  loader: () => getCompanyProfile(),
  component: HomePage,
})

function HomePage() {
  const profile = Route.useLoaderData()
  const needsSetup = !profile.businessName

  return (
    <div>
      {needsSetup && (
        <Link
          to="/settings"
          className="mb-6 flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 transition-colors hover:bg-blue-100"
        >
          Set up your business details before sending invoices &rarr;
        </Link>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
      </div>

      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground">No invoices yet</p>
        <Link
          to="/"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New invoice
        </Link>
      </div>
    </div>
  )
}
