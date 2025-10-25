'use client';

import { Auth } from '@/components/Auth';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthPage() {
  const auth = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already logged in (after validation completes)
  useEffect(() => {
    if (!auth.isValidatingSession && auth.currentUser) {
      router.push('/dashboard');
    }
  }, [auth.currentUser, auth.isValidatingSession, router]);

  // Show loading while validating session
  if (auth.isValidatingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Validating session...</p>
        </div>
      </div>
    );
  }

  // If logged in, show nothing (redirect will happen)
  if (auth.currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <Auth
      authMode={auth.authMode}
      setAuthMode={auth.setAuthMode}
      loginForm={auth.loginForm}
      setLoginForm={auth.setLoginForm}
      signupForm={auth.signupForm}
      setSignupForm={auth.setSignupForm}
      handleLogin={auth.handleLogin}
      handleSignup={auth.handleSignup}
      isLoggingIn={auth.isLoggingIn}
      isSigningUp={auth.isSigningUp}
      forgotPasswordMode={auth.forgotPasswordMode}
      setForgotPasswordMode={auth.setForgotPasswordMode}
      forgotPasswordEmail={auth.forgotPasswordEmail}
      setForgotPasswordEmail={auth.setForgotPasswordEmail}
      isSendingResetEmail={auth.isSendingResetEmail}
      resetEmailSentTo={auth.resetEmailSentTo}
      handleRequestPasswordReset={auth.handleRequestPasswordReset}
      signupVerificationEmail={auth.signupVerificationEmail}
      unverifiedLoginEmail={auth.unverifiedLoginEmail}
    />
  );
}
