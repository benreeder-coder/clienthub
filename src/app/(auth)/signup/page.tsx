import { Metadata } from 'next'
import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'
import { GlassCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your ClientHub account',
}

export default function SignupPage() {
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <CardTitle className="text-2xl font-display">Create an account</CardTitle>
        <CardDescription>
          Get started with your workspace
        </CardDescription>
      </CardHeader>

      <CardContent>
        <SignupForm />
      </CardContent>

      <CardFooter className="flex flex-col gap-4 text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </Link>
        </p>
      </CardFooter>
    </GlassCard>
  )
}
