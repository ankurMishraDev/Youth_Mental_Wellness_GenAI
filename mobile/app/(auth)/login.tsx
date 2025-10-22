import { useState } from "react"
import { View, Text, TextInput, Pressable, Alert } from "react-native"
import { useAuth } from "@/contexts/AuthContext"
import { login, signup } from "@/services/auth"

const LoginScreen = () => {
  const { setUser } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")

  const handleAuth = async () => {
    if (isLogin) {
      try {
        const user = await login(email, password)
        setUser(user)
      } catch (error) {
        Alert.alert("Login Failed", error.message)
      }
    } else {
      try {
        await signup({ email, password, name, age, gender })
        Alert.alert("Signup Successful", "Please check your email to verify your account.")
        setIsLogin(true)
      } catch (error) {
        Alert.alert("Signup Failed", error.message)
      }
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20 }}>
        {isLogin ? "Login" : "Sign Up"}
      </Text>
      {!isLogin && (
        <>
          <TextInput
            placeholder="Name"
            value={name}
            onChangeText={setName}
            style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
          />
          <TextInput
            placeholder="Age"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
          />
          <TextInput
            placeholder="Gender"
            value={gender}
            onChangeText={setGender}
            style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
          />
        </>
      )}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 }}
      />
      <Pressable
        onPress={handleAuth}
        style={{ backgroundColor: "#6366F1", padding: 15, borderRadius: 5, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>{isLogin ? "Login" : "Sign Up"}</Text>
      </Pressable>
      <Pressable onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 20 }}>
        <Text style={{ textAlign: "center", color: "#6366F1" }}>
          {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
        </Text>
      </Pressable>
    </View>
  )
}

export default LoginScreen
