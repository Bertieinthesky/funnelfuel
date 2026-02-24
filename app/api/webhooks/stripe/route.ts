import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { stitchFromPayment } from "@/lib/identity/stitch";
import { toJson } from "@/lib/json";
import { EventSource, EventType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!sig || !secret || !apiKey) {
    return NextResponse.json({ error: "Missing signature or Stripe config" }, { status: 400 });
  }

  const stripe = new Stripe(apiKey);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[Stripe webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session, event.id);
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handlePaymentIntent(pi, event.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/stripe] Error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const email = session.customer_details?.email;
  if (!email) return;

  // Find which organization owns this Stripe account
  // For now we use the client_reference_id field which orgs should set to their orgId
  const organizationId = session.client_reference_id;
  if (!organizationId) {
    console.warn("[Stripe webhook] No client_reference_id on session:", session.id);
    return;
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!org) return;

  // Stitch identity — this is a payment, so confidence = 100
  const { contactId } = await stitchFromPayment(organizationId, email, {
    firstName: session.customer_details?.name?.split(" ")[0],
    lastName: session.customer_details?.name?.split(" ").slice(1).join(" "),
    phone: session.customer_details?.phone ?? undefined,
  });

  const amountCents = session.amount_total ?? 0;

  // Record payment
  await db.payment.upsert({
    where: { externalId: session.payment_intent as string ?? session.id },
    create: {
      contactId,
      organizationId,
      amountCents,
      currency: session.currency ?? "usd",
      processor: "stripe",
      externalId: (session.payment_intent as string) ?? session.id,
      productName: session.metadata?.product_name ?? null,
      status: "succeeded",
    },
    update: { status: "succeeded" },
  });

  // Record purchase event
  await db.event.create({
    data: {
      organizationId,
      contactId,
      type: EventType.PURCHASE,
      source: EventSource.STRIPE_WEBHOOK,
      confidence: 100,
      externalId: eventId,
      data: toJson({ amountCents, currency: session.currency, email, stripeSessionId: session.id }),
    },
  }).catch(() => {}); // ignore duplicates
}

async function handlePaymentIntent(
  pi: Stripe.PaymentIntent,
  eventId: string
) {
  const email = pi.receipt_email ?? pi.metadata?.email;
  const organizationId = pi.metadata?.organizationId;
  if (!email || !organizationId) return;

  const { contactId } = await stitchFromPayment(organizationId, email, {
    firstName: pi.metadata?.firstName,
    lastName: pi.metadata?.lastName,
  });

  await db.payment.upsert({
    where: { externalId: pi.id },
    create: {
      contactId,
      organizationId,
      amountCents: pi.amount,
      currency: pi.currency,
      processor: "stripe",
      externalId: pi.id,
      status: "succeeded",
    },
    update: { status: "succeeded" },
  });

  await db.event.create({
    data: {
      organizationId,
      contactId,
      type: EventType.PURCHASE,
      source: EventSource.STRIPE_WEBHOOK,
      confidence: 100,
      externalId: eventId,
      data: toJson({ amountCents: pi.amount, currency: pi.currency, email }),
    },
  }).catch(() => {});
}
