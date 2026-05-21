import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { getCompanyProfile, updateCompanyProfile } from '#/server/settings.fn'
import { companyProfileInput } from '#/lib/validators'
import { CURRENCIES } from '#/lib/currency'

export const Route = createFileRoute('/settings')({
  head: () => ({ meta: [{ title: 'Settings · Ledger' }] }),
  loader: () => getCompanyProfile(),
  component: SettingsPage,
})

function SettingsPage() {
  const profile = Route.useLoaderData()
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      businessName: profile.businessName,
      address: profile.address,
      city: profile.city,
      postcode: profile.postcode,
      country: profile.country,
      email: profile.email,
      phone: profile.phone,
      taxId: profile.taxId,
      defaultCurrency: profile.defaultCurrency,
      taxRate: profile.taxRate,
      invoicePrefix: profile.invoicePrefix,
    },
    onSubmit: async ({ value }) => {
      const result = companyProfileInput.safeParse(value)
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string
          form.setFieldMeta(field as keyof typeof value, (prev) => ({
            ...prev,
            errorMap: { onChange: issue.message },
          }))
        }
        return
      }
      try {
        await updateCompanyProfile({ data: result.data })
        // Refresh the root loader so the sidebar picks up the new
        // businessName/email immediately, plus this page's own loader.
        await router.invalidate()
        toast.success('Saved')
      } catch {
        toast.error('Something went wrong. Please try again.')
      }
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your business profile and invoice defaults.
      </p>

      <form
        className="mt-8 space-y-10"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <section>
          <h2 className="text-lg font-medium">Business profile</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            This information appears on every invoice you create.
          </p>

          <div className="mt-6 grid max-w-2xl gap-6">
            <form.Field name="businessName">
              {(field) => (
                <FormField label="Business name" error={field.state.meta.errorMap.onChange}>
                  {(props) => (
                    <Input
                      {...props}
                      autoComplete="organization"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </FormField>
              )}
            </form.Field>

            <form.Field name="address">
              {(field) => (
                <FormField label="Address" error={field.state.meta.errorMap.onChange}>
                  {(props) => (
                    <Input
                      {...props}
                      autoComplete="street-address"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </FormField>
              )}
            </form.Field>

            <div className="grid grid-cols-3 gap-4">
              <form.Field name="city">
                {(field) => (
                  <FormField label="City" error={field.state.meta.errorMap.onChange}>
                    {(props) => (
                      <Input
                        {...props}
                        autoComplete="address-level2"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    )}
                  </FormField>
                )}
              </form.Field>

              <form.Field name="postcode">
                {(field) => (
                  <FormField label="Postcode" error={field.state.meta.errorMap.onChange}>
                    {(props) => (
                      <Input
                        {...props}
                        autoComplete="postal-code"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    )}
                  </FormField>
                )}
              </form.Field>

              <form.Field name="country">
                {(field) => (
                  <FormField label="Country" error={field.state.meta.errorMap.onChange}>
                    {(props) => (
                      <Input
                        {...props}
                        autoComplete="country-name"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    )}
                  </FormField>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="email">
                {(field) => (
                  <FormField label="Email" error={field.state.meta.errorMap.onChange}>
                    {(props) => (
                      <Input
                        {...props}
                        type="email"
                        autoComplete="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    )}
                  </FormField>
                )}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <FormField label="Phone" error={field.state.meta.errorMap.onChange}>
                    {(props) => (
                      <Input
                        {...props}
                        type="tel"
                        autoComplete="tel"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    )}
                  </FormField>
                )}
              </form.Field>
            </div>

            <form.Field name="taxId">
              {(field) => (
                <FormField label="Tax ID" error={field.state.meta.errorMap.onChange}>
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
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Invoice defaults</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pre-fill values for every new invoice. Each invoice can override these.
          </p>

          <div className="mt-6 grid max-w-2xl gap-6">
            <form.Field name="defaultCurrency">
              {(field) => (
                <FormField label="Default currency" error={field.state.meta.errorMap.onChange}>
                  {(props) => (
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger {...props} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code} · {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              )}
            </form.Field>

            <form.Field name="taxRate">
              {(field) => (
                <FormField label="Default tax rate (%)" error={field.state.meta.errorMap.onChange}>
                  {(props) => (
                    <Input
                      {...props}
                      type="text"
                      inputMode="decimal"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="max-w-32"
                    />
                  )}
                </FormField>
              )}
            </form.Field>

            <form.Field name="invoicePrefix">
              {(field) => (
                <FormField label="Invoice number prefix" error={field.state.meta.errorMap.onChange}>
                  {(props) => (
                    <Input
                      {...props}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="max-w-40"
                    />
                  )}
                </FormField>
              )}
            </form.Field>
          </div>
        </section>

        <div className="flex items-center gap-3 border-t pt-6">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting || undefined}
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  )
}
