/**
 * Email Service using Resend
 *
 * Handles transactional emails for invitations, notifications, etc.
 */

import { Resend } from "resend";

// Initialize Resend client lazily
let resendClient: Resend | null = null;

/**
 * Get Resend client instance
 * Throws if RESEND_API_KEY is not configured
 */
function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Get email configuration
 */
function getEmailConfig() {
  const from = process.env.EMAIL_FROM || "DocuMind <noreply@documind.app>";
  const replyTo = process.env.EMAIL_REPLY_TO;
  const webUrl = process.env.WEB_URL || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:5173";

  return { from, replyTo, webUrl };
}

/**
 * Email result type
 */
interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send team invitation email
 */
export async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  invitationToken: string;
}): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.log("[Email] Resend not configured, skipping invitation email");
    return { success: false, error: "Email service not configured" };
  }

  const { from, replyTo, webUrl } = getEmailConfig();
  const inviteUrl = `${webUrl}/invite?token=${params.invitationToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Been Invited!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 3px solid #000000; box-shadow: 6px 6px 0 #000000;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; border-bottom: 3px solid #000000; background-color: #6366f1;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 50px; height: 50px; background-color: #ffffff; border: 2px solid #000000; text-align: center; line-height: 50px; font-size: 24px; font-weight: bold; color: #6366f1; box-shadow: 3px 3px 0 #000000;">D</div>
                  </td>
                  <td style="padding-left: 15px; vertical-align: middle;">
                    <span style="font-size: 28px; font-weight: bold; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">DocuMind</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: bold; color: #000000; text-transform: uppercase;">You're Invited!</h1>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                <strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> on DocuMind as a <strong style="text-transform: capitalize;">${params.role}</strong>.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #333333;">
                DocuMind helps teams search, understand, and collaborate on documents using AI. Click the button below to accept your invitation.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="background-color: #6366f1; border: 2px solid #000000; box-shadow: 4px 4px 0 #000000;">
                    <a href="${inviteUrl}" style="display: block; padding: 15px 40px; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Accept Invitation</a>
                  </td>
                </tr>
              </table>

              <!-- Role Description -->
              <div style="padding: 20px; background-color: #f5f5f5; border: 2px solid #000000;">
                <p style="margin: 0 0 10px; font-size: 14px; font-weight: bold; color: #000000; text-transform: uppercase;">As a ${params.role}, you'll be able to:</p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #333333;">
                  ${params.role === "admin" ? `
                    <li>Manage team members and settings</li>
                    <li>Upload and organize documents</li>
                    <li>Search and ask questions about documents</li>
                  ` : params.role === "member" ? `
                    <li>Upload and organize documents</li>
                    <li>Search and ask questions about documents</li>
                    <li>Collaborate with team members</li>
                  ` : `
                    <li>View and search documents</li>
                    <li>Ask questions about documents</li>
                    <li>Browse team content</li>
                  `}
                </ul>
              </div>

              <p style="margin: 30px 0 0; font-size: 14px; color: #666666;">
                This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 3px solid #000000; background-color: #f5f5f5;">
              <p style="margin: 0; font-size: 12px; color: #666666; text-align: center;">
                &copy; ${new Date().getFullYear()} DocuMind. All rights reserved.<br>
                <a href="${webUrl}" style="color: #6366f1; text-decoration: none;">documind.app</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Link Fallback -->
        <p style="margin: 20px 0 0; font-size: 12px; color: #999999; text-align: center;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${inviteUrl}" style="color: #6366f1; word-break: break-all;">${inviteUrl}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
You're Invited to ${params.organizationName}!

${params.inviterName} has invited you to join ${params.organizationName} on DocuMind as a ${params.role}.

DocuMind helps teams search, understand, and collaborate on documents using AI.

Accept your invitation here:
${inviteUrl}

This invitation will expire in 7 days.

If you didn't expect this email, you can safely ignore it.

---
DocuMind - ${webUrl}
  `.trim();

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from,
      to: params.to,
      replyTo,
      subject: `${params.inviterName} invited you to ${params.organizationName} on DocuMind`,
      html,
      text,
    });

    if (result.error) {
      console.error("[Email] Failed to send invitation:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Invitation sent:", result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("[Email] Error sending invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.log("[Email] Resend not configured, skipping welcome email");
    return { success: false, error: "Email service not configured" };
  }

  const { from, replyTo, webUrl } = getEmailConfig();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to DocuMind!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 3px solid #000000; box-shadow: 6px 6px 0 #000000;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; border-bottom: 3px solid #000000; background-color: #6366f1;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 50px; height: 50px; background-color: #ffffff; border: 2px solid #000000; text-align: center; line-height: 50px; font-size: 24px; font-weight: bold; color: #6366f1; box-shadow: 3px 3px 0 #000000;">D</div>
                  </td>
                  <td style="padding-left: 15px; vertical-align: middle;">
                    <span style="font-size: 28px; font-weight: bold; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">DocuMind</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: bold; color: #000000; text-transform: uppercase;">Welcome, ${params.name}!</h1>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                Thanks for joining DocuMind. We're excited to help you and your team search, understand, and collaborate on documents using AI.
              </p>

              <h2 style="margin: 30px 0 15px; font-size: 18px; font-weight: bold; color: #000000; text-transform: uppercase;">Get Started</h2>

              <ol style="margin: 0 0 30px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #333333;">
                <li><strong>Upload your first document</strong> - PDFs, Word docs, and more</li>
                <li><strong>Ask questions</strong> - Use AI to search and understand your content</li>
                <li><strong>Invite your team</strong> - Collaborate together on your documents</li>
              </ol>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #6366f1; border: 2px solid #000000; box-shadow: 4px 4px 0 #000000;">
                    <a href="${webUrl}/dashboard" style="display: block; padding: 15px 40px; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 3px solid #000000; background-color: #f5f5f5;">
              <p style="margin: 0; font-size: 12px; color: #666666; text-align: center;">
                &copy; ${new Date().getFullYear()} DocuMind. All rights reserved.<br>
                <a href="${webUrl}" style="color: #6366f1; text-decoration: none;">documind.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Welcome to DocuMind, ${params.name}!

Thanks for joining DocuMind. We're excited to help you and your team search, understand, and collaborate on documents using AI.

Get Started:
1. Upload your first document - PDFs, Word docs, and more
2. Ask questions - Use AI to search and understand your content
3. Invite your team - Collaborate together on your documents

Go to your dashboard: ${webUrl}/dashboard

---
DocuMind - ${webUrl}
  `.trim();

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from,
      to: params.to,
      replyTo,
      subject: `Welcome to DocuMind, ${params.name}!`,
      html,
      text,
    });

    if (result.error) {
      console.error("[Email] Failed to send welcome email:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Welcome email sent:", result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("[Email] Error sending welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
