import { ReactNode } from "react"
import { View, Text } from "react-native"
import clsx from "clsx"

type CardProps = {
  children: ReactNode
  className?: string
}

type CardHeaderProps = {
  title: string
  subtitle?: string
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <View
      className={clsx(
        "bg-surface rounded-3xl shadow-elevated p-6 gap-4 dark:bg-surface-dark",
        className
      )}
    >
      {children}
    </View>
  )
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle }) => {
  return (
    <View>
      <Text className="text-2xl font-heading text-surface-foreground dark:text-surface-dark-foreground">
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-base text-surface-foreground/70 dark:text-surface-dark-foreground/70">
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}

export const CardContent: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return <View className={clsx("gap-3", className)}>{children}</View>
}
