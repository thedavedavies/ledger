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
import { FormField } from '#/components/ui/form-field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { localDateToDateOnly } from '#/lib/date-only'
import { toCents } from '#/lib/money'
import { PAYMENT_METHODS, paymentInput, type PaymentInput } from '#/lib/validators'
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
  return localDateToDateOnly()
}

function defaultAmount(balanceCents: bigint) {
  if (balanceCents <= 0n) return '0.00'
  const major = Number(balanceCents) / 100
  return major.toFixed(2)
}

function paymentErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return 'Could not record payment. Please try again.'
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

  const form = useForm({
    defaultValues: {
      invoiceId,
      amount: defaultAmount(balanceDueCents),
      paidAt: todayIso(),
      method: 'Bank transfer',
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
      try {
        await createPayment({ data: result.data })
        toast.success('Payment recorded')
        form.reset()
        await router.invalidate()
        onOpenChange(false)
      } catch (err) {
        toast.error(paymentErrorMessage(err))
      }
    },
  })

  const guardedOpenChange = (next: boolean) => {
    if (form.state.isSubmitting) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={guardedOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        onInteractOutside={(e) => {
          if (form.state.isSubmitting) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (form.state.isSubmitting) e.preventDefault()
        }}
      >
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
                <FormField label="Date" error={field.state.meta.errorMap.onChange}>
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </FormField>
              )}
            </form.Field>

            <form.Field name="amount">
              {(field) => (
                <FormField
                  label="Amount"
                  trailing={`Balance ${formatCents(balanceDueCents)}`}
                  error={field.state.meta.errorMap.onChange}
                >
                  {(props) => (
                    <Input
                      {...props}
                      inputMode="decimal"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </FormField>
              )}
            </form.Field>
          </div>

          <form.Field name="method">
            {(field) => (
              <FormField label="Method" error={field.state.meta.errorMap.onChange}>
                {(props) => (
                  <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                    <SelectTrigger {...props} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            )}
          </form.Field>

          <form.Field name="reference">
            {(field) => (
              <FormField
                label="Reference"
                trailing="Optional"
                error={field.state.meta.errorMap.onChange}
              >
                {(props) => (
                  <Input
                    {...props}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </FormField>
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <FormField
                label="Notes"
                trailing="Optional"
                error={field.state.meta.errorMap.onChange}
              >
                {(props) => (
                  <Textarea
                    {...props}
                    rows={3}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </FormField>
            )}
          </form.Field>

          <DialogFooter>
            <form.Subscribe
              selector={(s) => ({ isSubmitting: s.isSubmitting, amount: s.values.amount })}
            >
              {({ isSubmitting, amount }) => {
                const formatted = formatRecordAmount(amount, formatCents)
                return (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting || undefined}
                    >
                      {isSubmitting && (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      )}
                      {isSubmitting ? 'Recording…' : `Record${formatted ? ` ${formatted}` : ''}`}
                    </Button>
                  </>
                )
              }}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatRecordAmount(amount: string, formatCents: (cents: bigint) => string): string {
  const n = Number(amount)
  if (!isFinite(n) || n <= 0) return ''
  try {
    return formatCents(toCents(amount))
  } catch {
    return ''
  }
}
