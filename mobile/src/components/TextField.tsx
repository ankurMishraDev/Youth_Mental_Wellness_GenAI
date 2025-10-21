import { forwardRef } from "react"
import { TextInput, TextInputProps, View, Text } from "react-native"
import clsx from "clsx"

type Props = TextInputProps & {
  label?: string
  error?: string
}

export const TextField = forwardRef<TextInput, Props>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <View className="gap-2">
        {label ? (
          <Text className="text-sm font-heading text-surface-foreground dark:text-surface-dark-foreground">
            {label}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor="#94A3B8"
          className={clsx(
            "rounded-2xl border border-surface-strong dark:border-surface-dark-strong px-4 py-3 text-base text-surface-foreground dark:text-surface-dark-foreground bg-white dark:bg-surface-dark-muted",
            className
          )}
          {...props}
        />
        {error ? <Text className="text-sm text-feedback-danger">{error}</Text> : null}
      </View>
    )
  }
)

TextField.displayName = "TextField"
