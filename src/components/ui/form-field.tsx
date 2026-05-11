import { useId, type ReactNode } from 'react'
import { Label } from '#/components/ui/label'

/**
 * Props injected into the rendered control.  Spread these onto an `<Input>`,
 * `<Textarea>`, `<SelectTrigger>`, etc. so that:
 *
 *   - the visible `<label>` is programmatically tied to the control via
 *     `htmlFor` ↔ `id`, restoring click-to-focus and screen-reader pairing,
 *   - the control gets `aria-invalid` when there's a validation error,
 *   - the control points at the error message via `aria-describedby` so
 *     assistive tech announces the reason instead of just "invalid".
 */
export type FormFieldChildProps = {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

interface FormFieldProps {
  label: string
  /** Right-aligned hint shown next to the label, e.g. "Optional" or "Balance £300.00". */
  trailing?: ReactNode
  error?: string
  children: (props: FormFieldChildProps) => ReactNode
}

export function FormField({
  label,
  trailing,
  error,
  children,
}: FormFieldProps) {
  const reactId = useId()
  const id = `field-${reactId}`
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {trailing && (
          <span className="text-[11px] text-muted-foreground">{trailing}</span>
        )}
      </div>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': errorId,
      })}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
