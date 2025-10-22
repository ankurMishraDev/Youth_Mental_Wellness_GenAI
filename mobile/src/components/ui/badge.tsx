import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { cn } from "@/lib/utils"

export type BadgeProps = {
  children: ReactNode
  variant?: "default" | "outline" | "soft"
  className?: string
  textClassName?: string
}

export const Badge = ({
  children,
  variant = "default",
  className,
  textClassName,
}: BadgeProps) => {
  const base = "px-sm py-2xs rounded-pill"
  const variants: Record<typeof variant, { container: string; text: string }> = {
    default: {
      container: "bg-primary/10 border border-primary/40",
      text: "text-primary",
    },
    outline: {
      container: "border border-border",
      text: "text-foreground",
    },
    soft: {
      container: "bg-surface",
      text: "text-muted",
    },
  }

  const resolved = variants[variant]

  return (
    <View className={cn(base, resolved.container, className)}>
      <Text className={cn("text-xs font-medium", resolved.text, textClassName)}>{children}</Text>
    </View>
  )
}
