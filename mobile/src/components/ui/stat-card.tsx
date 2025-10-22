import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { Card } from "./card"

export type StatCardProps = {
  label: string
  value: string
  icon?: ReactNode
  helperText?: string
  className?: string
}

export const StatCard = ({ label, value, icon, helperText, className }: StatCardProps) => (
  <Card className={className}>
    <View className="flex-row items-center justify-between px-xl pt-xl pb-lg">
      <View className="flex-1">
        <Text className="text-sm text-muted mb-1">{label}</Text>
        <Text className="text-2xl font-semibold text-foreground">{value}</Text>
        {helperText ? <Text className="text-xs text-muted mt-1">{helperText}</Text> : null}
      </View>
      {icon ? <View className="ml-md">{icon}</View> : null}
    </View>
  </Card>
)
