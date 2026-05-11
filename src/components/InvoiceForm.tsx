import { useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { FormField } from '#/components/ui/form-field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { invoiceInput, type InvoiceInput } from '#/lib/validators'
import { fromCents, toCents, computeInvoiceTotals, formatMoney } from '#/lib/money'

interface Client {
  id: string
  name: string
}

interface InvoiceFormProps {
  defaultValues: InvoiceInput
  clients: Client[]
  currency: string
  onSubmit: (data: InvoiceInput) => Promise<void>
  submitLabel: string
}

function tryComputeTotals(lineItems: InvoiceInput['lineItems'], taxRate: string) {
  try {
    const lines = lineItems
      .filter((li) => li.quantity && li.unitPrice)
      .map((li) => {
        const qty = Number(li.quantity)
        const price = Number(li.unitPrice)
        if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) return null
        return { quantity: li.quantity, unitPriceCents: toCents(li.unitPrice) }
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)

    if (lines.length === 0) return null

    const rate = taxRate === '' ? 0 : Number(taxRate)
    if (isNaN(rate)) return null

    return computeInvoiceTotals(lines, rate)
  } catch {
    return null
  }
}

function computeLineTotal(quantity: string, unitPrice: string): string | null {
  try {
    const qty = Number(quantity)
    const price = Number(unitPrice)
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) return null
    if (quantity === '' || unitPrice === '') return null
    const cents = toCents(unitPrice)
    const { lineTotals } = computeInvoiceTotals(
      [{ quantity, unitPriceCents: cents }],
      0,
    )
    return fromCents(lineTotals[0]!)
  } catch {
    return null
  }
}

export function InvoiceForm({
  defaultValues,
  clients,
  currency,
  onSubmit,
  submitLabel,
}: InvoiceFormProps) {
  const descriptionRefs = useRef<Map<number, HTMLInputElement>>(new Map())

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const result = invoiceInput.safeParse(value)
      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path.map(String).join('.')
          if (path === 'lineItems') {
            form.setFieldMeta('lineItems' as keyof typeof value, (prev) => ({
              ...prev,
              errorMap: { onChange: issue.message },
            }))
          } else {
            const field = issue.path[0] as string
            form.setFieldMeta(field as keyof typeof value, (prev) => ({
              ...prev,
              errorMap: { onChange: issue.message },
            }))
          }
        }
        return
      }
      await onSubmit(result.data)
    },
  })

  return (
    <form
      className="mt-8 space-y-8"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <div className="grid max-w-3xl gap-6">
        <section>
          <h2 className="text-lg font-medium">Bill to</h2>
          <div className="mt-4 grid gap-6">
            <form.Field name="clientId">
              {(field) => (
                <FormField
                  label="Client"
                  error={field.state.meta.errorMap.onChange}
                >
                  {(props) => (
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v)}
                    >
                      <SelectTrigger {...props} className="w-full">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              )}
            </form.Field>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Dates and terms</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <form.Field name="issueDate">
              {(field) => (
                <FormField
                  label="Issue date"
                  error={field.state.meta.errorMap.onChange}
                >
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

            <form.Field name="dueDate">
              {(field) => (
                <FormField
                  label="Due date"
                  error={field.state.meta.errorMap.onChange}
                >
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
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Line items</h2>
          <form.Field name="lineItems" mode="array">
            {(field) => (
              <div className="mt-4">
                {field.state.meta.errorMap.onChange && (
                  <p
                    role="alert"
                    className="mb-2 text-sm text-destructive"
                  >
                    {field.state.meta.errorMap.onChange}
                  </p>
                )}
                <div className="rounded-lg border">
                  <div className="grid grid-cols-[1fr_80px_120px_100px_40px] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit price</span>
                    <span className="text-right">Amount</span>
                    <span />
                  </div>

                  {field.state.value.map((_, i) => (
                    <form.Field key={i} name={`lineItems[${i}]`}>
                      {(lineField) => {
                        const line = lineField.state.value as InvoiceInput['lineItems'][number]
                        const lineTotal = computeLineTotal(
                          line.quantity,
                          line.unitPrice,
                        )
                        return (
                          <div className="grid grid-cols-[1fr_80px_120px_100px_40px] items-center gap-2 border-b px-3 py-2 last:border-b-0">
                            <form.Field name={`lineItems[${i}].description`}>
                              {(descField) => (
                                <Input
                                  ref={(el) => {
                                    if (el) descriptionRefs.current.set(i, el)
                                    else descriptionRefs.current.delete(i)
                                  }}
                                  value={descField.state.value}
                                  onBlur={descField.handleBlur}
                                  onChange={(e) =>
                                    descField.handleChange(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.preventDefault()
                                  }}
                                  placeholder="Description"
                                  className="h-8 text-sm"
                                />
                              )}
                            </form.Field>
                            <form.Field name={`lineItems[${i}].quantity`}>
                              {(qtyField) => (
                                <Input
                                  value={qtyField.state.value}
                                  onBlur={qtyField.handleBlur}
                                  onChange={(e) =>
                                    qtyField.handleChange(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.preventDefault()
                                  }}
                                  placeholder="0"
                                  inputMode="decimal"
                                  className="h-8 text-right text-sm"
                                />
                              )}
                            </form.Field>
                            <form.Field name={`lineItems[${i}].unitPrice`}>
                              {(priceField) => (
                                <Input
                                  value={priceField.state.value}
                                  onBlur={priceField.handleBlur}
                                  onChange={(e) =>
                                    priceField.handleChange(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.preventDefault()
                                  }}
                                  placeholder="0.00"
                                  inputMode="decimal"
                                  className="h-8 text-right text-sm"
                                />
                              )}
                            </form.Field>
                            <div className="text-right text-sm tabular-nums text-muted-foreground">
                              {lineTotal !== null ? lineTotal : '—'}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Remove line item ${i + 1}`}
                              aria-disabled={
                                field.state.value.length <= 1 || undefined
                              }
                              className="h-8 w-8 cursor-pointer p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground"
                              onClick={() => {
                                if (field.state.value.length <= 1) return
                                field.removeValue(i)
                                requestAnimationFrame(() => {
                                  const target = Math.max(0, i - 1)
                                  const ref =
                                    descriptionRefs.current.get(target)
                                  ref?.focus()
                                })
                              }}
                            >
                              <Trash2 className="size-3.5" aria-hidden={false} />
                            </Button>
                          </div>
                        )
                      }}
                    </form.Field>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    field.pushValue({
                      description: '',
                      quantity: '1',
                      unitPrice: '',
                    })
                  }
                >
                  <Plus className="size-3.5" />
                  Add line
                </Button>
              </div>
            )}
          </form.Field>
        </section>

        <section>
          <form.Subscribe
            selector={(state) => ({
              lineItems: state.values.lineItems,
              taxRate: state.values.taxRate,
            })}
          >
            {({ lineItems, taxRate }) => {
              const totals = tryComputeTotals(lineItems, taxRate)
              const rate = taxRate === '' ? 0 : Number(taxRate)
              return (
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">
                        {totals
                          ? formatMoney(totals.subtotalCents, currency)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tax{!isNaN(rate) && rate > 0 ? ` ${rate}%` : ''}
                      </span>
                      <span className="tabular-nums">
                        {totals
                          ? formatMoney(totals.taxCents, currency)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-base font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">
                        {totals
                          ? formatMoney(totals.totalCents, currency)
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            }}
          </form.Subscribe>
        </section>

        <section>
          <div className="grid gap-6">
            <form.Field name="taxRate">
              {(field) => (
                <FormField
                  label="Tax rate (%)"
                  error={field.state.meta.errorMap.onChange}
                >
                  {(props) => (
                    <Input
                      {...props}
                      type="text"
                      inputMode="decimal"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="0"
                      className="max-w-32"
                    />
                  )}
                </FormField>
              )}
            </form.Field>

            <form.Field name="notes">
              {(field) => (
                <FormField
                  label="Notes"
                  error={field.state.meta.errorMap.onChange}
                >
                  {(props) => (
                    <textarea
                      {...props}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Payment terms, bank details, or additional notes..."
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  )}
                </FormField>
              )}
            </form.Field>
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3 border-t pt-6">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

