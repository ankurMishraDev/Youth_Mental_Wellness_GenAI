import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageCircle, Home } from "lucide-react"
import { AuthMode } from "../lib/types"
import Link from "next/link"

interface AuthProps {
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  loginForm: { email: string; password: string }
  setLoginForm: (form: { email: string; password: string }) => void
  signupForm: { email: string; password: string; name: string; age: string; gender: string }
  setSignupForm: (form: { email: string; password: string; name: string; age: string; gender: string }) => void
  handleLogin: () => void
  handleSignup: () => void
  isLoggingIn: boolean
  isSigningUp: boolean
  forgotPasswordMode: boolean
  setForgotPasswordMode: (mode: boolean) => void
  forgotPasswordEmail: string
  setForgotPasswordEmail: (email: string) => void
  isSendingResetEmail: boolean
  resetEmailSentTo: string | null
  handleRequestPasswordReset: () => void
  signupVerificationEmail: string | null
  unverifiedLoginEmail: string | null
}

const InfoBanner: React.FC<{ message: string; tone?: "info" | "warning" }> = ({ message, tone = "info" }) => {
  const toneClasses =
    tone === "warning"
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : "bg-sky-100 text-sky-900 border-sky-200"
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${toneClasses}`}>
      {message}
    </div>
  )
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
  isLoggingIn,
  isSigningUp,
  forgotPasswordMode,
  setForgotPasswordMode,
  forgotPasswordEmail,
  setForgotPasswordEmail,
  isSendingResetEmail,
  resetEmailSentTo,
  handleRequestPasswordReset,
  signupVerificationEmail,
  unverifiedLoginEmail,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4">
      {/* Home Button */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 px-4 py-2 bg-card hover:bg-accent text-card-foreground rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border"
      >
        <Home size={20} />
        <span className="font-medium">Home</span>
      </Link>

      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto shadow-lg">
            <MessageCircle className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Welcome to CureZ
            </CardTitle>
            <CardDescription className="text-lg mt-2">Your AI-powered companion for mental wellness</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as AuthMode)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              {unverifiedLoginEmail && (
                <InfoBanner
                  tone="warning"
                  message={`Your email (${unverifiedLoginEmail}) is not verified yet. We have sent you a new verification link.`}
                />
              )}
              {!forgotPasswordMode ? (
                <>
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
                  <Button
                    onClick={handleLogin}
                    className="w-full h-12 text-lg font-semibold"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? "Logging in..." : "Login"}
                  </Button>
                  <Button variant="link" onClick={() => setForgotPasswordMode(true)} className="w-full">
                    Forgot your password?
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="h-12"
                  />
                  {resetEmailSentTo && (
                    <InfoBanner
                      message={`Password reset link sent to ${resetEmailSentTo}. Please check your inbox.`}
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Enter your registered email to receive a password reset link from Firebase.
                  </p>
                  <Button
                    onClick={handleRequestPasswordReset}
                    disabled={isSendingResetEmail}
                    className="w-full h-12 text-lg font-semibold"
                  >
                    {isSendingResetEmail ? "Sending reset link..." : "Send reset link"}
                  </Button>
                  <Button variant="ghost" onClick={() => setForgotPasswordMode(false)} className="w-full">
                    Back to login
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              {signupVerificationEmail && (
                <InfoBanner
                  message={`We sent a verification link to ${signupVerificationEmail}. Please verify your email before logging in.`}
                />
              )}
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
              <p className="text-xs text-muted-foreground">
                We will send a verification link to your email via Firebase Authentication. Please verify before logging in.
              </p>
              <Button
                onClick={handleSignup}
                className="w-full h-12 text-lg font-semibold"
                disabled={isSigningUp}
              >
                {isSigningUp ? "Creating account..." : "Create Account"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}