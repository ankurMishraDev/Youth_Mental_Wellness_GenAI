import type { ReactNode } from "react"
import { View, Text } from "react-native"
import { cn } from "@/lib/utils"

export type CardProps = {
  children: ReactNode
  className?: string
}

export const Card = ({ children, className }: CardProps) => (
  <View
    className={cn("bg-card rounded-lg border border-border/40", className)}
    style={{
      shadowColor: "rgba(15,23,42,0.22)",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 4,
    }}
  >
    {children}
  </View>
)

export const CardHeader = ({ children, className }: CardProps) => (
  <View className={cn("px-xl pt-xl", className)}>{children}</View>
)

export const CardTitle = ({ children, className }: CardProps) => (
  <Text className={cn("text-xl font-semibold text-foreground", className)}>{children}</Text>
)

export const CardDescription = ({ children, className }: CardProps) => (
  <Text className={cn("text-sm text-muted", className)}>{children}</Text>
)

export const CardContent = ({ children, className }: CardProps) => (
  <View className={cn("px-xl pb-xl flex-col", className)}>{children}</View>
)
