import type { PiiRedactionResult, PiiType } from '../types/api';

function isCalendarOrAcademicNumber(value: string): boolean {
  // Preserve YYYYMMDD dates (e.g. 20261114)
  if (/^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/.test(value)) {
    return true;
  }
  // Preserve academic year spans concatenated (e.g. 20262027)
  if (/^(?:19|20)\d{2}(?:19|20)\d{2}$/.test(value)) {
    return true;
  }
  return false;
}

/**
 * Lightweight client-side PII redaction layer.
 * Catches accidental emails, phone numbers (including +213 / 05-06-07 Algerian formats),
 * student/national IDs, and bearer/password tokens before prompts leave the browser.
 */
export function redactSensitivePii(rawInput: string): PiiRedactionResult {
  let text = rawInput;
  const detected = new Set<PiiType>();

  // 1. Passwords / API keys / JWT tokens pasted accidentally
  const secretRegex =
    /\b(?:password|passwd|pwd|mot\s*de\s*passe|كلمة\s*المرور)\s*[:=]\s*\S+|Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
  text = text.replace(secretRegex, () => {
    detected.add('secret');
    return '[REDACTED_SECRET]';
  });

  // 2. Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  text = text.replace(emailRegex, () => {
    detected.add('email');
    return '[REDACTED_EMAIL]';
  });

  // 3. Phone numbers (Algerian +213 / 05-06-07 mobile, landline, and international formats)
  const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}\b/g;
  text = text.replace(phoneRegex, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (isCalendarOrAcademicNumber(digitsOnly)) {
      return match;
    }
    if (digitsOnly.length >= 9 && digitsOnly.length <= 15) {
      detected.add('phone');
      return '[REDACTED_PHONE]';
    }
    return match;
  });

  // 4. Student matricules / BAC / CNE / National ID patterns (e.g. UN20241234, AB123456, 9-18 digit IDs)
  const studentIdRegex = /\b(?:[A-Z]{1,3}\d{6,10}|\d{9,18})\b/g;
  text = text.replace(studentIdRegex, (match) => {
    if (isCalendarOrAcademicNumber(match)) {
      return match;
    }
    detected.add('student_id');
    return '[REDACTED_ID]';
  });

  return {
    sanitizedText: text,
    redactedTypes: Array.from(detected),
  };
}
