import { useForm } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { FormField } from '#/components/ui/form-field'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { clientInput, type ClientInput } from '#/lib/validators'

interface ClientFormProps {
  defaultValues: ClientInput
  onSubmit: (data: ClientInput) => Promise<void>
  submitLabel: string
}

export function ClientForm({ defaultValues, onSubmit, submitLabel }: ClientFormProps) {
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const result = clientInput.safeParse(value)
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
      await onSubmit(result.data)
    },
  })

  return (
    <form
      className="mt-8 space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <div className="grid max-w-2xl gap-6">
        <form.Field name="name">
          {(field) => (
            <FormField label="Contact name" error={field.state.meta.errorMap.onChange}>
              {(props) => (
                <Input
                  {...props}
                  autoComplete="name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>

        <form.Field name="companyName">
          {(field) => (
            <FormField label="Company name" error={field.state.meta.errorMap.onChange}>
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

        <form.Field name="notes">
          {(field) => (
            <FormField label="Notes" error={field.state.meta.errorMap.onChange}>
              {(props) => (
                <Textarea
                  {...props}
                  rows={4}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>
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
