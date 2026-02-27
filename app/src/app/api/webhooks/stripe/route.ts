import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { orders, creditBalances } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";

const BUNDLED_CREDITS = 10;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (!metadata?.user_id || !metadata?.variant) {
      console.error("Missing metadata on checkout session:", session.id);
      return NextResponse.json({ received: true });
    }

    // Create the order
    try {
      await db.insert(orders).values({
        userId: metadata.user_id,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        status: "paid",
        variant: metadata.variant,
        colour: metadata.colour || null,
        amountTotal: session.amount_total,
        currency: session.currency,
      });
    } catch (err) {
      console.error("Failed to create order:", err);
    }

    // Credit the user with bundled credits (upsert)
    try {
      await db
        .insert(creditBalances)
        .values({
          userId: metadata.user_id,
          balance: BUNDLED_CREDITS,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: creditBalances.userId,
          set: {
            balance: sql`${creditBalances.balance} + ${BUNDLED_CREDITS}`,
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      console.error("Failed to update credits:", err);
    }
  }

  return NextResponse.json({ received: true });
}
