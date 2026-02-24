// Identity Stitching
//
// Links anonymous sessions to known contact records using email, phone,
// and fingerprint signals. All writes are wrapped in db.$transaction() so
// a mid-operation failure can't leave a contact with missing signals.
//
// Confidence levels:
//   100 — Payment webhook (proof of transaction)
//    90 — Email from form submission
//    85 — Phone from form submission
//    65 — Device fingerprint (probabilistic)

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { IdentityType, Prisma } from "@prisma/client";

export interface ContactInfo {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

export interface StitchResult {
  contactId: string;
  isNew: boolean;
  confidence: number;
}

type Tx = Prisma.TransactionClient;

function hashValue(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function stitchIdentity(
  organizationId: string,
  sessionKey: string,
  contact: ContactInfo,
  fingerprint?: string
): Promise<StitchResult> {
  const { email, phone, firstName, lastName } = contact;

  return db.$transaction(async (tx) => {
    let existingContactId: string | null = null;
    let confidence = 65;

    // 1. Email match (highest confidence)
    if (email) {
      const signal = await tx.identitySignal.findFirst({
        where: { type: IdentityType.EMAIL, value: hashValue(email), contact: { organizationId } },
        select: { contactId: true },
      });
      if (signal) { existingContactId = signal.contactId; confidence = 90; }
    }

    // 2. Phone match
    if (!existingContactId && phone) {
      const signal = await tx.identitySignal.findFirst({
        where: { type: IdentityType.PHONE, value: hashValue(normalizePhone(phone)), contact: { organizationId } },
        select: { contactId: true },
      });
      if (signal) { existingContactId = signal.contactId; confidence = 85; }
    }

    // 3. Fingerprint match (probabilistic fallback)
    if (!existingContactId && fingerprint) {
      const signal = await tx.identitySignal.findFirst({
        where: { type: IdentityType.FINGERPRINT, value: fingerprint, contact: { organizationId } },
        select: { contactId: true },
      });
      if (signal) { existingContactId = signal.contactId; confidence = 65; }
    }

    if (existingContactId) {
      await tx.contact.update({
        where: { id: existingContactId },
        data: {
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
        },
      });
      await linkSessionToContact(tx, sessionKey, existingContactId, fingerprint);
      await upsertSignals(tx, existingContactId, contact, fingerprint);
      return { contactId: existingContactId, isNew: false, confidence };
    }

    // No match — create new contact (all in the same transaction)
    const newContact = await tx.contact.create({
      data: {
        organizationId,
        email: email ?? null,
        phone: phone ?? null,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
      },
    });

    await linkSessionToContact(tx, sessionKey, newContact.id, fingerprint);
    await upsertSignals(tx, newContact.id, contact, fingerprint);

    return { contactId: newContact.id, isNew: true, confidence };
  });
}

async function linkSessionToContact(
  tx: Tx,
  sessionKey: string,
  contactId: string,
  fingerprint?: string
) {
  await tx.session.updateMany({ where: { sessionKey }, data: { contactId } });

  if (fingerprint) {
    // Retroactively claim anonymous sessions with the same fingerprint
    await tx.session.updateMany({
      where: { fingerprint, contactId: null },
      data: { contactId },
    });
  }
}

async function upsertSignals(
  tx: Tx,
  contactId: string,
  contact: ContactInfo,
  fingerprint?: string
) {
  const now = new Date();

  const signals: Array<{ type: IdentityType; value: string; rawValue: string; confidence: number }> = [];

  if (contact.email) {
    signals.push({ type: IdentityType.EMAIL, value: hashValue(contact.email), rawValue: contact.email, confidence: 90 });
  }
  if (contact.phone) {
    signals.push({ type: IdentityType.PHONE, value: hashValue(normalizePhone(contact.phone)), rawValue: contact.phone, confidence: 85 });
  }
  if (fingerprint) {
    signals.push({ type: IdentityType.FINGERPRINT, value: fingerprint, rawValue: fingerprint, confidence: 65 });
  }

  for (const signal of signals) {
    await tx.identitySignal.upsert({
      where: { contactId_type_value: { contactId, type: signal.type, value: signal.value } },
      create: { contactId, type: signal.type, value: signal.value, rawValue: signal.rawValue, confidence: signal.confidence, firstSeen: now, lastSeen: now },
      update: { lastSeen: now, rawValue: signal.rawValue },
    });
  }
}

export async function stitchFromPayment(
  organizationId: string,
  email: string,
  paymentData: { firstName?: string; lastName?: string; phone?: string }
): Promise<StitchResult> {
  const emailHash = hashValue(email);

  return db.$transaction(async (tx) => {
    const signal = await tx.identitySignal.findFirst({
      where: { type: IdentityType.EMAIL, value: emailHash, contact: { organizationId } },
      select: { contactId: true },
    });

    if (signal) {
      await tx.contact.update({
        where: { id: signal.contactId },
        data: {
          email,
          ...(paymentData.firstName ? { firstName: paymentData.firstName } : {}),
          ...(paymentData.lastName ? { lastName: paymentData.lastName } : {}),
          ...(paymentData.phone ? { phone: paymentData.phone } : {}),
        },
      });
      // Payment-verified email gets confidence upgraded to 100
      await tx.identitySignal.updateMany({
        where: { contactId: signal.contactId, type: IdentityType.EMAIL, value: emailHash },
        data: { confidence: 100, lastSeen: new Date() },
      });
      return { contactId: signal.contactId, isNew: false, confidence: 100 };
    }

    const newContact = await tx.contact.create({
      data: {
        organizationId,
        email,
        firstName: paymentData.firstName ?? null,
        lastName: paymentData.lastName ?? null,
        phone: paymentData.phone ?? null,
      },
    });

    await tx.identitySignal.create({
      data: {
        contactId: newContact.id,
        type: IdentityType.EMAIL,
        value: emailHash,
        rawValue: email,
        confidence: 100,
      },
    });

    return { contactId: newContact.id, isNew: true, confidence: 100 };
  });
}
