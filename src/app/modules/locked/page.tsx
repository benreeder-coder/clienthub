'use client'

import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { LockedModuleOverlay } from '@/components/shared/locked-module-overlay'

export default function LockedModulePage() {
  const searchParams = useSearchParams()
  const moduleKey = searchParams.get('module') || 'unknown'

  const handleRequestAccess = () => {
    // In production, this would create a task/notification for admin
    toast.success('Access request submitted!', {
      description: 'Our team will review your request and get back to you.',
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LockedModuleOverlay
        moduleKey={moduleKey}
        onRequestAccess={handleRequestAccess}
      />
    </div>
  )
}
