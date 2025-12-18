/**
 * PandaDoc API Client
 *
 * Full integration with PandaDoc for contract management.
 * Used for:
 * - Receiving webhook events when contracts are signed
 * - Extracting package/tier information from documents
 * - Auto-provisioning organizations based on signed contracts
 */

const PANDADOC_API_BASE = 'https://api.pandadoc.com/public/v1'

interface PandaDocConfig {
  apiKey: string
  webhookSecret?: string
}

interface PandaDocDocument {
  id: string
  name: string
  status: string
  date_created: string
  date_modified: string
  date_completed?: string
  expiration_date?: string
  metadata?: Record<string, unknown>
  fields?: PandaDocField[]
  recipients?: PandaDocRecipient[]
}

interface PandaDocField {
  name: string
  value: string
  type: string
}

interface PandaDocRecipient {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: string
  has_completed: boolean
  signing_order?: number
}

interface PandaDocWebhookPayload {
  event: string
  data: {
    id: string
    name: string
    status: string
    date_completed?: string
    recipients?: PandaDocRecipient[]
    metadata?: Record<string, unknown>
  }
}

// Webhook event types
export type PandaDocEventType =
  | 'document_state_changed'
  | 'recipient_completed'
  | 'document_updated'
  | 'document_deleted'

// Document status types
export type PandaDocDocumentStatus =
  | 'document.draft'
  | 'document.sent'
  | 'document.viewed'
  | 'document.waiting_approval'
  | 'document.approved'
  | 'document.waiting_pay'
  | 'document.paid'
  | 'document.completed'
  | 'document.voided'
  | 'document.declined'

export class PandaDocClient {
  private apiKey: string
  private webhookSecret?: string

  constructor(config: PandaDocConfig) {
    this.apiKey = config.apiKey
    this.webhookSecret = config.webhookSecret
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('PandaDoc webhook secret not configured')
      return true // Skip verification if secret not set
    }

    // PandaDoc uses HMAC-SHA256 for webhook signatures
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Get document details by ID
   */
  async getDocument(documentId: string): Promise<PandaDocDocument | null> {
    try {
      const response = await fetch(
        `${PANDADOC_API_BASE}/documents/${documentId}/details`,
        {
          headers: {
            Authorization: `API-Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.error('PandaDoc API error:', response.status, await response.text())
        return null
      }

      return response.json()
    } catch (error) {
      console.error('PandaDoc getDocument error:', error)
      return null
    }
  }

  /**
   * Get document fields (form data)
   */
  async getDocumentFields(documentId: string): Promise<PandaDocField[]> {
    try {
      const response = await fetch(
        `${PANDADOC_API_BASE}/documents/${documentId}/fields`,
        {
          headers: {
            Authorization: `API-Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.error('PandaDoc API error:', response.status, await response.text())
        return []
      }

      const data = await response.json()
      return data.fields || []
    } catch (error) {
      console.error('PandaDoc getDocumentFields error:', error)
      return []
    }
  }

  /**
   * Extract package/tier information from document fields
   */
  extractPackageInfo(fields: PandaDocField[]): {
    packageName: string | null
    tierLevel: string | null
    companyName: string | null
    clientEmail: string | null
    clientName: string | null
  } {
    const getFieldValue = (name: string): string | null => {
      const field = fields.find(
        (f) => f.name.toLowerCase() === name.toLowerCase()
      )
      return field?.value || null
    }

    return {
      packageName:
        getFieldValue('package') ||
        getFieldValue('package_name') ||
        getFieldValue('plan') ||
        getFieldValue('tier'),
      tierLevel:
        getFieldValue('tier_level') ||
        getFieldValue('tier') ||
        getFieldValue('level'),
      companyName:
        getFieldValue('company_name') ||
        getFieldValue('company') ||
        getFieldValue('organization'),
      clientEmail:
        getFieldValue('client_email') ||
        getFieldValue('email') ||
        getFieldValue('signer_email'),
      clientName:
        getFieldValue('client_name') ||
        getFieldValue('name') ||
        getFieldValue('signer_name'),
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(body: string): PandaDocWebhookPayload | null {
    try {
      return JSON.parse(body)
    } catch (error) {
      console.error('Failed to parse PandaDoc webhook payload:', error)
      return null
    }
  }

  /**
   * Check if document is fully completed (signed by all parties)
   */
  isDocumentCompleted(payload: PandaDocWebhookPayload): boolean {
    return (
      payload.event === 'document_state_changed' &&
      payload.data.status === 'document.completed'
    )
  }

  /**
   * List documents with optional filters
   */
  async listDocuments(options?: {
    status?: string
    tag?: string
    folder?: string
    page?: number
    count?: number
  }): Promise<PandaDocDocument[]> {
    try {
      const params = new URLSearchParams()
      if (options?.status) params.append('status', options.status)
      if (options?.tag) params.append('tag', options.tag)
      if (options?.folder) params.append('folder_uuid', options.folder)
      if (options?.page) params.append('page', options.page.toString())
      if (options?.count) params.append('count', options.count.toString())

      const response = await fetch(
        `${PANDADOC_API_BASE}/documents?${params.toString()}`,
        {
          headers: {
            Authorization: `API-Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.error('PandaDoc API error:', response.status, await response.text())
        return []
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('PandaDoc listDocuments error:', error)
      return []
    }
  }

  /**
   * Create document from template
   */
  async createDocumentFromTemplate(options: {
    templateId: string
    name: string
    recipients: Array<{
      email: string
      first_name?: string
      last_name?: string
      role: string
    }>
    fields?: Record<string, string>
    metadata?: Record<string, unknown>
  }): Promise<{ id: string } | null> {
    try {
      const response = await fetch(`${PANDADOC_API_BASE}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `API-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_uuid: options.templateId,
          name: options.name,
          recipients: options.recipients,
          fields: options.fields,
          metadata: options.metadata,
        }),
      })

      if (!response.ok) {
        console.error('PandaDoc API error:', response.status, await response.text())
        return null
      }

      return response.json()
    } catch (error) {
      console.error('PandaDoc createDocumentFromTemplate error:', error)
      return null
    }
  }

  /**
   * Send document for signing
   */
  async sendDocument(
    documentId: string,
    options?: {
      message?: string
      subject?: string
      silent?: boolean
    }
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${PANDADOC_API_BASE}/documents/${documentId}/send`,
        {
          method: 'POST',
          headers: {
            Authorization: `API-Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: options?.message || 'Please review and sign this document.',
            subject: options?.subject,
            silent: options?.silent || false,
          }),
        }
      )

      if (!response.ok) {
        console.error('PandaDoc API error:', response.status, await response.text())
        return false
      }

      return true
    } catch (error) {
      console.error('PandaDoc sendDocument error:', error)
      return false
    }
  }
}

/**
 * Create PandaDoc client from environment variables
 */
export function createPandaDocClient(): PandaDocClient {
  const apiKey = process.env.PANDADOC_API_KEY
  if (!apiKey) {
    throw new Error('PANDADOC_API_KEY environment variable is not set')
  }

  return new PandaDocClient({
    apiKey,
    webhookSecret: process.env.PANDADOC_WEBHOOK_SECRET,
  })
}

/**
 * Map package names to template IDs
 */
export const PACKAGE_TO_TEMPLATE: Record<string, string> = {
  starter: 'standard-client-portal', // Template slug/ID
  standard: 'standard-client-portal',
  professional: 'standard-client-portal',
  outreach: 'outreach-only',
  'outreach-only': 'outreach-only',
  enterprise: 'full-stack-agency',
  'full-stack': 'full-stack-agency',
}

/**
 * Get template ID from package name
 */
export function getTemplateForPackage(packageName: string): string {
  const normalized = packageName.toLowerCase().trim()
  return PACKAGE_TO_TEMPLATE[normalized] || 'standard-client-portal'
}
