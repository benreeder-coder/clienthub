import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto">
        {/* Logo/Brand */}
        <div className="mb-8 relative">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyber-blue to-cyber-cyan shadow-neon-blue">
            <svg
              className="w-10 h-10 text-white"
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
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-display font-bold mb-4">
          <span className="text-gradient">ClientHub</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
          Your all-in-one client portal for managing projects, tasks, and workflows with enterprise-grade security.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium transition-all hover:shadow-neon-blue hover:scale-105 btn-neon"
          >
            Sign In
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-border bg-background/50 backdrop-blur font-medium transition-all hover:bg-accent hover:text-accent-foreground hover:border-accent"
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className="glass-card rounded-xl p-6 transition-all hover:scale-105 hover:shadow-glow-sm"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyber-blue/20 to-cyber-cyan/20 flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-24 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} BTB AI. All rights reserved.</p>
      </footer>
    </div>
  )
}

const features = [
  {
    title: 'Multi-Tenant Security',
    description: 'Enterprise-grade isolation ensures your clients only see their own data.',
    icon: (
      <svg className="w-6 h-6 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Modular Workspaces',
    description: 'Enable only the features each client needs with our template system.',
    icon: (
      <svg className="w-6 h-6 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    title: 'Seamless Onboarding',
    description: 'Automated client onboarding from contract signing to workspace setup.',
    icon: (
      <svg className="w-6 h-6 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
]
