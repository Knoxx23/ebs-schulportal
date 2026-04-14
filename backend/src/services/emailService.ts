import dotenv from 'dotenv';
import { logError } from './loggerService';

dotenv.config();

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@schule.de';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

let transporter: any = null;
let nodemailerAvailable = false;

// Try to load nodemailer (optional dependency)
try {
  const nodemailer = require('nodemailer');
  nodemailerAvailable = true;

  if (SMTP_HOST && SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    console.log('[Email] SMTP configured:', SMTP_HOST);
  }
} catch {
  console.log('[Email] nodemailer not installed - emails will be disabled');
}

export function isEmailConfigured(): boolean {
  return !!(transporter && SMTP_HOST && SMTP_USER);
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    console.log(`[Email] Would send to ${to}: ${subject} (SMTP not configured)`);
    return false;
  }

  try {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed:', error);
    logError(error as Error, { recipient: to, subject, operation: 'sendMail' });
    return false;
  }
}

// Send invitation link to parent
export async function sendInvitationEmail(
  parentEmail: string,
  childName: string,
  activationUrl: string,
  code: string
): Promise<boolean> {
  return sendMail(parentEmail, `Einschulungsblatt f\u00fcr ${childName} - Bitte ausf\u00fcllen`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Einschulungsblatt-System (EBS)</h2>
      <p>Sehr geehrte Erziehungsberechtigte,</p>
      <p>Bitte f\u00fcllen Sie das Einschulungsblatt f\u00fcr <strong>${childName}</strong> online aus.</p>
      <div style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Ihr Aktivierungscode:</strong></p>
        <p style="font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 4px; margin: 0;">${code}</p>
      </div>
      <p>
        <a href="${activationUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Formular \u00f6ffnen</a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Falls der Button nicht funktioniert:<br><a href="${activationUrl}">${activationUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #9ca3af; font-size: 12px;">Diese E-Mail wurde automatisch vom EBS gesendet.</p>
    </div>
  `);
}

// Send return notification to parent
export async function sendReturnNotification(
  parentEmail: string,
  childName: string,
  returnNote: string
): Promise<boolean> {
  return sendMail(parentEmail, `Einschulungsblatt f\u00fcr ${childName} - Korrektur erforderlich`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Einschulungsblatt-System (EBS)</h2>
      <p>Sehr geehrte Erziehungsberechtigte,</p>
      <p>Das Einschulungsblatt f\u00fcr <strong>${childName}</strong> wurde zur\u00fcckgegeben.</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; color: #991b1b;"><strong>Anmerkung der Schule:</strong></p>
        <p style="margin: 10px 0 0 0;">${returnNote}</p>
      </div>
      <p>Bitte \u00f6ffnen Sie den urspr\u00fcnglichen Link, um Ihre Angaben zu korrigieren.</p>
      <p><a href="${APP_URL}/activate" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Formular \u00f6ffnen</a></p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #9ca3af; font-size: 12px;">Diese E-Mail wurde automatisch vom EBS gesendet.</p>
    </div>
  `);
}

// Send password reset email
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/school/reset-password?token=${resetToken}`;
  return sendMail(userEmail, 'EBS - Passwort zur\u00fccksetzen', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Einschulungsblatt-System (EBS)</h2>
      <p>Hallo ${userName},</p>
      <p>Sie haben eine Passwort-Zur\u00fccksetzung angefordert.</p>
      <p><a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Passwort zur\u00fccksetzen</a></p>
      <p style="color: #6b7280; font-size: 14px;">Dieser Link ist 1 Stunde g\u00fcltig.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #9ca3af; font-size: 12px;">Diese E-Mail wurde automatisch vom EBS gesendet.</p>
    </div>
  `);
}

// Send approval notification to parent
export async function sendApprovalNotification(
  parentEmail: string,
  childName: string
): Promise<boolean> {
  return sendMail(parentEmail, `Einschulungsblatt f\u00fcr ${childName} - Genehmigt`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Einschulungsblatt-System (EBS)</h2>
      <p>Sehr geehrte Erziehungsberechtigte,</p>
      <p>Das Einschulungsblatt f\u00fcr <strong>${childName}</strong> wurde genehmigt.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; color: #166534;">&#10003; Ihr Einschulungsblatt wurde genehmigt und verarbeitet.</p>
      </div>
      <p>Vielen Dank!</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #9ca3af; font-size: 12px;">Diese E-Mail wurde automatisch vom EBS gesendet.</p>
    </div>
  `);
}
