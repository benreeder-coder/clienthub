import { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { GlassCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your ClientHub password',
}

export default function ForgotPasswordPage() {
  return (
    <GlassCard className="w-full">
      <CardHeader className="text-center">
        {/* Logo */}
        <div className="mx-auto mb-4 w-16 h-16 rounded-xl bg-gradient-to-br from-cyber-blue to-cyber-cyan flex items-center justify-center shadow-neon-blue">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>
        <CardTitle className="text-2xl font-display">Reset password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ForgotPasswordForm />
      </CardContent>

      <CardFooter className="flex flex-col gap-4 text-center text-sm">
        <p className="text-muted-foreground">
          Remember your password?{' '}
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </GlassCard>
  )
}
