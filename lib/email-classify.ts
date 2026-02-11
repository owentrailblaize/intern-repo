/**
 * Classify emails as human vs automated (verification codes, companies, notifications, etc.)
 * Used for inbox tab separation: New (human) vs Automated
 */

const AUTOMATED_PATTERNS = {
  fromEmail: [
    /noreply@/i,
    /no-reply@/i,
    /donotreply@/i,
    /do-not-reply@/i,
    /notifications@/i,
    /notification@/i,
    /mailer-daemon@/i,
    /postmaster@/i,
    /automated@/i,
    /auto@/i,
    /alert@/i,
    /alerts@/i,
    /newsletter@/i,
    /news@/i,
    /marketing@/i,
    /@.*\.(amazon|google|microsoft|apple|facebook|linkedin|twitter|stripe|verification|security)\./i,
  ],
  subject: [
    /verification/i,
    /verify.*(code|email|account)/i,
    /password.*reset/i,
    /reset.*password/i,
    /security.*code/i,
    /confirmation.*code/i,
    /one-time.*code/i,
    /otp/i,
    /your.*code/i,
    /2fa|two-factor|two factor/i,
    /unsubscribe/i,
    /don't reply|do not reply/i,
    /automated.*message/i,
    /order.*confirmed/i,
    /receipt.*for/i,
    /shipping.*update/i,
    /invoice.*#/i,
    /delivery.*update/i,
  ],
};

export interface EmailForClassification {
  fromEmail: string;
  from?: string;
  subject?: string;
}

export function isAutomatedEmail(email: EmailForClassification): boolean {
  const from = (email.fromEmail || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();

  for (const pattern of AUTOMATED_PATTERNS.fromEmail) {
    if (pattern.test(from)) return true;
  }

  for (const pattern of AUTOMATED_PATTERNS.subject) {
    if (pattern.test(subject)) return true;
  }

  return false;
}
