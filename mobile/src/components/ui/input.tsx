import type { ForwardedRef } from "react"
import { forwardRef } from "react"
import { TextInput, TextInputProps } from "react-native"
import { cn } from "@/lib/utils"
import { tokens } from "@/theme/tokens"

export type InputProps = TextInputProps & {
  className?: string
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ className, placeholderTextColor = tokens.colors.muted, ...props }, ref) => {
    return (
      <TextInput
        ref={ref as ForwardedRef<TextInput>}
        placeholderTextColor={placeholderTextColor}
        className={cn(
          "border border-border bg-surface text-foreground px-lg py-sm rounded-lg font-sans",
          "focus:border-primary",
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"
