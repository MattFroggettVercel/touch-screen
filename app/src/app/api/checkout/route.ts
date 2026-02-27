import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { stripe, VARIANT_PRICE_MAP } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { variant, colour } = await request.json();

    if (!variant || !VARIANT_PRICE_MAP[variant]) {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }

    const priceId = VARIANT_PRICE_MAP[variant];
    if (!priceId) {
      return NextResponse.json(
        { error: "Product not configured in Stripe" },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: session.user.id,
        variant,
        colour: colour || "",
      },
      success_url: `${origin}/order/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?variant=${variant}&colour=${colour || ""}`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
