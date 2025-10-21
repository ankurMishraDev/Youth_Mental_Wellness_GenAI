import { Pressable, Text, type PressableProps } from "react-native"
import clsx from "clsx"

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger"

type Props = PressableProps & {
  title: string
  variant?: ButtonVariant
  fullWidth?: boolean
  className?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-foreground dark:bg-brand-dark dark:text-brand-dark-foreground",
  secondary: "bg-accent text-surface-foreground",
  outline:
    "border border-surface-strong text-surface-foreground dark:border-surface-dark-strong",
  ghost: "bg-transparent text-surface-foreground",
  danger: "bg-feedback-danger text-white",
}

export const Button = ({
  title,
  variant = "primary",
  fullWidth,
  style,
  className,
  ...pressableProps
}: Props) => {
  return (
    <Pressable
      accessibilityRole="button"
      {...pressableProps}
      className={clsx(
        "px-4 py-3 rounded-xl items-center justify-center",
        fullWidth && "w-full",
        variantStyles[variant],
        className
      )}
      style={style}
    >
      <Text className="font-heading text-base" selectable={false}>
        {title}
      </Text>
    </Pressable>
  )
}
