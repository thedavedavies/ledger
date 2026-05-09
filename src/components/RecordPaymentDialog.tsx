import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { paymentInput, type PaymentInput } from '#/lib/validators'
import { createPayment } from '#/server/payments.fn'

interface Props {
  invoiceId: string
  invoiceNumber: string
  clientName: string | null
  balanceDueCents: bigint
  formatCents: (n: bigint) => string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function defaultAmount(balanceCents: bigint) {
  if (balanceCents <= 0n) return '0.00'
  const major = Number(balanceCents) / 100
  return major.toFixed(2)
}

export function RecordPaymentDialog({
  invoiceId,
  invoiceNumber,
  clientName,
  balanceDueCents,
  formatCents,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    defaultValues: {
      invoiceId,
      amount: defaultAmount(balanceDueCents),
      paidAt: todayIso(),
      method: '',
      reference: '',
      notes: '',
    } satisfies PaymentInput,
    onSubmit: async ({ value }) => {
      const result = paymentInput.safeParse(value)
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path[0] as keyof PaymentInput
          form.setFieldMeta(field, (prev) => ({
            ...prev,
            errorMap: { onChange: issue.message },
          }))
        }
        return
      }
      setSubmitting(true)
      try {
        await createPayment({ data: result.data })
        toast.success('Payment recorded')
        onOpenChange(false)
        form.reset()
        await router.invalidate()
      } catch {
        toast.error('Could not record payment. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px] font-normal tracking-tight">
            Record payment
          </DialogTitle>
          <DialogDescription>
            Against {invoiceNumber}
            {clientName ? ` · ${clientName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="paidAt">
              {(field) => (
                <Field
                  label="Date"
                  error={field.state.meta.errorMap.onChange}
                >
                  <Input
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="amount">
              {(field) => (
                <Field
                  label="Amount"
                  trailing={`Balance ${formatCents(balanceDueCents)}`}
                  error={field.state.meta.errorMap.onChange}
                >
                  <Input
                    inputMode="decimal"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field name="method">
            {(field) => (
              <Field
                label="Method"
                trailing="Optional"
                error={field.state.meta.errorMap.onChange}
              >
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Bank transfer, Cheque, Cash"
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="reference">
            {(field) => (
              <Field
                label="Reference"
                trailing="Optional"
                error={field.state.meta.errorMap.onChange}
              >
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. BAC-7741"
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <Field
                label="Notes"
                trailing="Optional"
                error={field.state.meta.errorMap.onChange}
              >
                <Textarea
                  rows={3}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <form.Subscribe selector={(s) => s.values.amount}>
              {(amount) => (
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  Record{amount ? ` ${formatAmount(amount)}` : ''}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatAmount(amount: string) {
  const n = Number(amount)
  if (!isFinite(n) || n <= 0) return ''
  // Currency-symbol-less rendering — the dialog header already says invoice; user
  // sees the actual currency on the invoice itself.
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function Field({
  label,
  trailing,
  error,
  children,
}: {
  label: string
  trailing?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {trailing && (
          <span className="text-[11px] text-muted-foreground">{trailing}</span>
        )}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
