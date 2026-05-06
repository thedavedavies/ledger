import { useForm } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { clientInput, type ClientInput } from '#/lib/validators'

interface ClientFormProps {
  defaultValues: ClientInput
  onSubmit: (data: ClientInput) => Promise<void>
  submitLabel: string
}

export function ClientForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: ClientFormProps) {
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
            <FormField
              label="Client name"
              error={field.state.meta.errorMap.onChange}
            >
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Acme Inc."
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <FormField
              label="Email"
              error={field.state.meta.errorMap.onChange}
            >
              <Input
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="billing@example.com"
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="address">
          {(field) => (
            <FormField
              label="Address"
              error={field.state.meta.errorMap.onChange}
            >
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="123 Main St"
              />
            </FormField>
          )}
        </form.Field>

        <div className="grid grid-cols-3 gap-4">
          <form.Field name="city">
            {(field) => (
              <FormField
                label="City"
                error={field.state.meta.errorMap.onChange}
              >
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </FormField>
            )}
          </form.Field>

          <form.Field name="postcode">
            {(field) => (
              <FormField
                label="Postcode"
                error={field.state.meta.errorMap.onChange}
              >
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </FormField>
            )}
          </form.Field>

          <form.Field name="country">
            {(field) => (
              <FormField
                label="Country"
                error={field.state.meta.errorMap.onChange}
              >
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </FormField>
            )}
          </form.Field>
        </div>

        <form.Field name="phone">
          {(field) => (
            <FormField
              label="Phone"
              error={field.state.meta.errorMap.onChange}
            >
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
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

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
