import { Resend } from 'resend'

/**
 * Resend Email Client
 *
 * Handles all email communications:
 * - Welcome emails for new users
 * - Onboarding step reminders
 * - Admin notifications
 * - Task assignments
 */

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

// Email from address
const FROM_EMAIL = process.env.EMAIL_FROM || 'ClientHub <noreply@clienthub.app>'
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@clienthub.app'

interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(options: {
  to: string
  name: string
  orgName: string
  loginUrl: string
}): Promise<EmailResult> {
  const resend = getResendClient()

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      replyTo: REPLY_TO,
      subject: `Welcome to ${options.orgName} on ClientHub`,
      html: getWelcomeEmailHtml(options),
      text: getWelcomeEmailText(options),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send onboarding reminder email
 */
export async function sendOnboardingReminder(options: {
  to: string
  name: string
  orgName: string
  currentStep: string
  completedSteps: number
  totalSteps: number
  dashboardUrl: string
}): Promise<EmailResult> {
  const resend = getResendClient()

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      replyTo: REPLY_TO,
      subject: `Continue your ${options.orgName} setup`,
      html: getOnboardingReminderHtml(options),
      text: getOnboardingReminderText(options),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send task assignment notification
 */
export async function sendTaskAssignmentEmail(options: {
  to: string
  name: string
  taskTitle: string
  taskDescription?: string
  dueDate?: string
  assignedBy: string
  taskUrl: string
}): Promise<EmailResult> {
  const resend = getResendClient()

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      replyTo: REPLY_TO,
      subject: `New task assigned: ${options.taskTitle}`,
      html: getTaskAssignmentHtml(options),
      text: getTaskAssignmentText(options),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send admin notification
 */
export async function sendAdminNotification(options: {
  to: string | string[]
  subject: string
  message: string
  actionUrl?: string
  actionLabel?: string
}): Promise<EmailResult> {
  const resend = getResendClient()

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      replyTo: REPLY_TO,
      subject: `[Admin] ${options.subject}`,
      html: getAdminNotificationHtml(options),
      text: getAdminNotificationText(options),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

function getWelcomeEmailHtml(options: {
  name: string
  orgName: string
  loginUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c; color: #e2e8f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to ClientHub</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 24px; margin: 0 0 16px;">
        Hi ${options.name},
      </p>

      <p style="font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        Your workspace for <strong style="color: #3b82f6;">${options.orgName}</strong> is ready! You can now access your client portal and start managing your projects.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${options.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Access Your Portal
        </a>
      </div>

      <p style="font-size: 14px; line-height: 22px; color: #94a3b8; margin: 0 0 16px;">
        <strong>What you can do:</strong>
      </p>

      <ul style="font-size: 14px; line-height: 22px; color: #94a3b8; margin: 0 0 24px; padding-left: 20px;">
        <li>View and manage your projects</li>
        <li>Track tasks and progress</li>
        <li>Access documents and reports</li>
        <li>Communicate with our team</li>
      </ul>

      <p style="font-size: 14px; line-height: 22px; color: #94a3b8; margin: 0;">
        If you have any questions, simply reply to this email and we'll be happy to help.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 32px; background-color: #0a0f1c; border-top: 1px solid #1e293b; text-align: center;">
      <p style="font-size: 12px; color: #64748b; margin: 0;">
        ClientHub - Your Agency Partner Portal
      </p>
    </div>
  </div>
</body>
</html>
`
}

function getWelcomeEmailText(options: {
  name: string
  orgName: string
  loginUrl: string
}): string {
  return `
Hi ${options.name},

Your workspace for ${options.orgName} is ready! You can now access your client portal and start managing your projects.

Access Your Portal: ${options.loginUrl}

What you can do:
- View and manage your projects
- Track tasks and progress
- Access documents and reports
- Communicate with our team

If you have any questions, simply reply to this email and we'll be happy to help.

---
ClientHub - Your Agency Partner Portal
`
}

function getOnboardingReminderHtml(options: {
  name: string
  orgName: string
  currentStep: string
  completedSteps: number
  totalSteps: number
  dashboardUrl: string
}): string {
  const progressPercent = Math.round((options.completedSteps / options.totalSteps) * 100)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c; color: #e2e8f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
    <!-- Content -->
    <div style="padding: 32px;">
      <h2 style="color: #f8fafc; margin: 0 0 16px; font-size: 24px;">Continue Your Setup</h2>

      <p style="font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        Hi ${options.name}, you're ${progressPercent}% through setting up ${options.orgName}.
      </p>

      <!-- Progress Bar -->
      <div style="background-color: #1e293b; border-radius: 8px; height: 8px; margin-bottom: 24px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); border-radius: 8px; height: 100%; width: ${progressPercent}%;"></div>
      </div>

      <p style="font-size: 14px; color: #94a3b8; margin: 0 0 16px;">
        <strong>Next step:</strong> ${options.currentStep}
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${options.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Continue Setup
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`
}

function getOnboardingReminderText(options: {
  name: string
  orgName: string
  currentStep: string
  completedSteps: number
  totalSteps: number
  dashboardUrl: string
}): string {
  const progressPercent = Math.round((options.completedSteps / options.totalSteps) * 100)

  return `
Hi ${options.name},

You're ${progressPercent}% through setting up ${options.orgName}.

Next step: ${options.currentStep}

Continue Setup: ${options.dashboardUrl}
`
}

function getTaskAssignmentHtml(options: {
  name: string
  taskTitle: string
  taskDescription?: string
  dueDate?: string
  assignedBy: string
  taskUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c; color: #e2e8f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
    <div style="padding: 32px;">
      <h2 style="color: #f8fafc; margin: 0 0 16px; font-size: 24px;">New Task Assigned</h2>

      <p style="font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        Hi ${options.name}, ${options.assignedBy} has assigned you a new task:
      </p>

      <div style="background-color: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #f8fafc; margin: 0 0 8px; font-size: 18px;">${options.taskTitle}</h3>
        ${options.taskDescription ? `<p style="font-size: 14px; color: #94a3b8; margin: 0 0 12px;">${options.taskDescription}</p>` : ''}
        ${options.dueDate ? `<p style="font-size: 14px; color: #f59e0b; margin: 0;"><strong>Due:</strong> ${options.dueDate}</p>` : ''}
      </div>

      <div style="text-align: center;">
        <a href="${options.taskUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Task
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`
}

function getTaskAssignmentText(options: {
  name: string
  taskTitle: string
  taskDescription?: string
  dueDate?: string
  assignedBy: string
  taskUrl: string
}): string {
  return `
Hi ${options.name},

${options.assignedBy} has assigned you a new task:

${options.taskTitle}
${options.taskDescription ? `\n${options.taskDescription}` : ''}
${options.dueDate ? `\nDue: ${options.dueDate}` : ''}

View Task: ${options.taskUrl}
`
}

function getAdminNotificationHtml(options: {
  subject: string
  message: string
  actionUrl?: string
  actionLabel?: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c; color: #e2e8f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
    <div style="background-color: #7c3aed; padding: 16px 32px;">
      <p style="color: white; margin: 0; font-weight: 600;">Admin Notification</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #f8fafc; margin: 0 0 16px; font-size: 24px;">${options.subject}</h2>
      <p style="font-size: 16px; line-height: 24px; margin: 0 0 24px; white-space: pre-wrap;">${options.message}</p>
      ${options.actionUrl ? `
        <div style="text-align: center;">
          <a href="${options.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            ${options.actionLabel || 'View Details'}
          </a>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
`
}

function getAdminNotificationText(options: {
  subject: string
  message: string
  actionUrl?: string
  actionLabel?: string
}): string {
  return `
[Admin Notification]

${options.subject}

${options.message}
${options.actionUrl ? `\n${options.actionLabel || 'View Details'}: ${options.actionUrl}` : ''}
`
}
