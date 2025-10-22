import { Text, TextInput, View } from "react-native";

interface ProfileFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  keyboardType?: "default" | "numeric" | "email-address";
}

export const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  onChangeText,
  editable = false,
  keyboardType,
}) => {
  return (
    <View className="mb-4">
      <Text className="mb-1 font-[Inter_500Medium] text-xs text-muted">{label}</Text>
      <TextInput
        value={value}
        editable={editable}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder="Add details"
        placeholderTextColor="#64748b"
        className={`h-12 rounded-xl border px-4 font-[Inter_500Medium] text-foreground ${
          editable ? "border-primary/40 bg-card" : "border-white/5 bg-surface"
        }`}
      />
    </View>
  );
};
