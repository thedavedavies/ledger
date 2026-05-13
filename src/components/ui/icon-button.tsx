import * as React from "react"

import { Button, type buttonVariants } from "#/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip"
import type { VariantProps } from "class-variance-authority"

/**
 * Icon-only button with a built-in tooltip and a visually hidden label.
 *
 * The `label` becomes both the button's accessible name (via an sr-only span,
 * so it survives auto-translate) and the visual tooltip shown on hover/focus.
 * Radix's Tooltip handles Esc-to-dismiss and the aria-describedby wiring.
 *
 * Pass the icon (and only the icon) as `children`.
 */
type IconButtonProps = Omit<React.ComponentProps<"button">, "aria-label"> &
  VariantProps<typeof buttonVariants> & {
    label: string
    tooltipSide?: "top" | "right" | "bottom" | "left"
  }

function IconButton({
  label,
  tooltipSide = "top",
  children,
  ...props
}: IconButtonProps) {
  const ariaDisabled = props["aria-disabled"]
  const inactive =
    props.disabled || ariaDisabled === true || ariaDisabled === "true"

  const button = (
    <Button {...props}>
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  )

  if (inactive) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  )
}

export { IconButton }
