import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageCircle } from "lucide-react"
import { AuthMode } from "../lib/types"

interface AuthProps {
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  loginForm: { email: string; password: string }
  setLoginForm: (form: { email: string; password: string }) => void
  signupForm: { email: string; password: string; name: string; age: string; gender: string }
  setSignupForm: (form: { email: string; password: string; name: string; age: string; gender: string }) => void
  handleLogin: () => void
  handleSignup: () => void
}

export const Auth: React.FC<AuthProps> = ({
  authMode,
  setAuthMode,
  loginForm,
  setLoginForm,
  signupForm,
  setSignupForm,
  handleLogin,
  handleSignup,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto shadow-lg">
            <MessageCircle className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              YouthGuide
            </CardTitle>
            <CardDescription className="text-lg mt-2">Your personal AI mentor for mental wellness</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as AuthMode)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="h-12"
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="h-12"
              />
              <Button onClick={handleLogin} className="w-full h-12 text-lg font-semibold">
                Login
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <Input
                type="text"
                placeholder="Full Name"
                value={signupForm.name}
                onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                className="h-12"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Age"
                  min="13"
                  max="25"
                  value={signupForm.age}
                  onChange={(e) => setSignupForm({ ...signupForm, age: e.target.value })}
                  className="h-12"
                  required
                />
                <Select
                  value={signupForm.gender}
                  onValueChange={(value) => setSignupForm({ ...signupForm, gender: value })}
                  required
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="email"
                placeholder="Email"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                className="h-12"
                required
              />
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                minLength={6}
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                className="h-12"
                required
              />
              <Button onClick={handleSignup} className="w-full h-12 text-lg font-semibold">
                Create Account
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}