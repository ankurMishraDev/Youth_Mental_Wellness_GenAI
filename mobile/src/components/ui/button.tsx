import type { ReactNode } from "react"
import { Pressable, PressableProps, Text } from "react-native"
import { cn } from "@/lib/utils"

const variantStyles: Record<
  "primary" | "secondary" | "outline" | "ghost",
  { button: string; text: string }
> = {
  primary: {
    button: "bg-primary rounded-lg",
    text: "text-primary-foreground",
  },
  secondary: {
    button: "bg-secondary rounded-lg",
    text: "text-secondary-foreground",
  },
  outline: {
    button: "border border-border bg-transparent rounded-lg",
    text: "text-foreground",
  },
  ghost: {
    button: "bg-transparent rounded-lg",
    text: "text-foreground",
  },
}

const sizeStyles: Record<"sm" | "md" | "lg", { button: string; text: string }> = {
  sm: {
    button: "px-md py-xs",
    text: "text-sm",
  },
  md: {
    button: "px-lg py-sm",
    text: "text-base",
  },
  lg: {
    button: "px-xl py-md",
    text: "text-lg",
  },
}

export type ButtonProps = PressableProps & {
  children: ReactNode
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  className?: string
  textClassName?: string
}

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  disabled,
  className,
  textClassName,
  ...props
}: ButtonProps) => {
  const { button: buttonVariant, text: textVariant } = variantStyles[variant]
  const { button: buttonSize, text: textSize } = sizeStyles[size]

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(
        "items-center justify-center rounded-lg",
        buttonVariant,
        buttonSize,
        disabled && "opacity-50",
        className
      )}
      {...props}
    >
      <Text className={cn("font-semibold", textVariant, textSize, textClassName)}>
        {children}
      </Text>
    </Pressable>
  )
}
