import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/clients')({
  component: ClientsPage,
})

function ClientsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground">No clients yet</p>
      </div>
    </div>
  )
}
