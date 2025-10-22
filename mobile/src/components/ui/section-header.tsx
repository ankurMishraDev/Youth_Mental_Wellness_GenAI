import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { cn } from "@/lib/utils"

export type SectionHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export const SectionHeader = ({ title, subtitle, action, className }: SectionHeaderProps) => (
  <View className={cn("flex-row items-center justify-between", className)}>
    <View className="flex-1 pr-md">
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
      {subtitle ? <Text className="text-sm text-muted mt-1">{subtitle}</Text> : null}
    </View>
    {action ? <View className="ml-md">{action}</View> : null}
  </View>
)
