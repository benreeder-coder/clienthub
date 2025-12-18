import { Metadata } from 'next'
import { requireModuleAccess } from '@/lib/auth/guards'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, FileText, Upload } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Manage your documents',
}

export default async function DocumentsPage() {
  await requireModuleAccess('documents')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Store and share files
          </p>
        </div>
        <Button variant="neon" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Empty State */}
      <Card className="text-center py-12">
        <CardContent>
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No documents yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload your first document to get started
          </p>
          <Button variant="neon" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
