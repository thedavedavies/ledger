import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Invoicing
      </h1>
      <p className="mt-2 text-muted-foreground">
        Open-source invoicing software. Self-hosted, simple, yours.
      </p>
    </main>
  )
}
