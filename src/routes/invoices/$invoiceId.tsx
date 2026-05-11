import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/invoices/$invoiceId')({
  component: () => <Outlet />,
})
