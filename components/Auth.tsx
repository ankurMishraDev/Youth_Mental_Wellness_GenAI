import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { MessageCircle, Home } from "lucide-react"
import { AuthMode } from "../lib/types"
import Link from "next/link"
import { useState } from "react"

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
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false)
  const [hasAgreedToConsent, setHasAgreedToConsent] = useState(false)
  const [isConsentChecked, setIsConsentChecked] = useState(false)

  const handleConfirmConsent = () => {
    if (isConsentChecked) {
      setHasAgreedToConsent(true)
      setIsConsentModalOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
      {/* Consent Modal */}
      <Dialog open={isConsentModalOpen} onOpenChange={setIsConsentModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
            <DialogDescription>
              Please read and agree to the terms and conditions before creating an account.
            </DialogDescription>
          </DialogHeader>
          <div className="prose dark:prose-invert max-h-96 overflow-y-auto p-4">
            <h4>1. Acceptance of Terms</h4>
            <p>
              By agreeing to these terms and conditions, you acknowledge that you have read, understood, and accepted
              all the provisions outlined herein. These terms govern your use of our services and outline your rights
              and responsibilities as a user. Please ensure that you fully comprehend the implications of these terms
              before proceeding with account creation.
            </p>
            <br />
            <h4>2. Not a Medical Substitute</h4>
            <p>
              Curie, our AI companion, is designed to provide mental wellness support in your daily life and to act as a
              first level of mental health assistant. It is not a substitute for professional medical advice, diagnosis,
              or treatment. In such cases, you can directly contact our professional mental health consultants. Always
              seek the advice of your physician or other qualified health provider with any questions you may have
              regarding a medical condition.
            </p>
            <br />
            <h4>3. Data and Privacy</h4>
            <p>
              Curie does not store your personal conversations and is committed to protecting your privacy and
              confidentiality. However, Curie does track your responses and feedback to improve the services and provide
              personalized recommendations.
            </p>
            <br />
            <h4>4. Information Collection</h4>
            <p>
              In every interaction, Curie captures your emotional state and well-being based on your inputs, except for
              personal conversations. Apart from emotional state (mood, energy levels, stress levels, etc.), Curie also
              collects some of your personal information over time to provide better mental health and wellness
              services. This information may include:
            </p>
            <ul className="list-disc pl-6">
              <li>Demographic information (age, gender, name, email)</li>
              <li>Behavioural Profile (interests, habits, etc.)</li>
              <li>Communication Profile (comfort level, preferred communication channels, etc.)</li>
              <li>Cultural Profile (Cultural background, values, beliefs, etc.)</li>
              <li>Historical Profile (past experiences, significant life events, etc.)</li>
              <li>Academic Profile (educational background, skills, etc.)</li>
              <li>Strength Profile (personal strengths, coping mechanisms, etc.)</li>
            </ul>
            <p>
              Curie never asks for any of the above information directly. It is inferred over time based on your
              interactions and conversations with Curie. This information is used to tailor the AI responses and
              recommendations to your unique needs and preferences.
            </p>
            <br />
            <h4>5. Security</h4>
            <p>
              We take your privacy seriously and implement robust security measures to protect your data. We provide
              end-to-end encryption for all of your collected data and do not share your information with third persons
              without your explicit consent. You can delete your account and all associated data at any time in profile
              settings.
            </p>
            <br />
            <h4>6. Prototype Notice</h4>
            <p className="font-semibold text-amber-600">
              This is a prototype application. By using this service, you acknowledge that:
            </p>
            <ul className="list-disc pl-6">
              <li>Account deletion is immediate and cannot be reversed</li>
              <li>We recommend exporting your data before account deletion</li>
              <li>No backup retention or recovery services are available</li>
              <li>The application may contain bugs or incomplete features</li>
            </ul>
            <br />
            <h4>7. Agreement</h4>
            <p>
              By using Curie, you agree to the collection and use of your information as described in our Privacy
              Policy.
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox id="consent" checked={isConsentChecked} onCheckedChange={(checked) => setIsConsentChecked(checked as boolean)} />
            <label
              htmlFor="consent"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the terms and conditions
            </label>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmConsent} disabled={!isConsentChecked}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Home Button */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 px-4 py-2 bg-card hover:bg-accent text-card-foreground rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border"
      >
        <Home size={20} />
        <span className="font-medium">Home</span>
      </Link>

      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <MessageCircle className="h-10 w-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
              Welcome to CureZ
            </CardTitle>
            <CardDescription className="text-lg mt-2 text-orange-800/80">Your AI-powered companion for mental wellness</CardDescription>
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
                We will send a verification link to your email via Firebase Authentication. Please verify before logging in. Check your spam folder if you don't see it in your inbox.
              </p>
              <Button variant="outline" onClick={() => setIsConsentModalOpen(true)} className="w-full">
                {hasAgreedToConsent ? "✔ Terms Agreed" : "View Terms and Conditions"}
              </Button>
              <Button
                onClick={handleSignup}
                className="w-full h-12 text-lg font-semibold"
                disabled={isSigningUp || !hasAgreedToConsent}
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
