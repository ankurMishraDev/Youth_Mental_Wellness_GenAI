import { View, Text } from "react-native"
import { Button } from "@/components/Button"
import { useTheme } from "@/contexts/ThemeContext"

export const ThemeToggle = () => {
  const { scheme, toggleTheme } = useTheme()

  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-base font-heading text-surface-foreground dark:text-surface-dark-foreground">
        {scheme === "light" ? "Light" : "Dark"} Mode
      </Text>
      <Button
        title={scheme === "light" ? "Enable Dark" : "Enable Light"}
        variant="outline"
        onPress={toggleTheme}
      />
    </View>
  )
}
