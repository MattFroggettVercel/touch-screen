import { redirect } from "next/navigation";
import { stripe, VARIANT_LABELS } from "@/lib/stripe";
import Link from "next/link";

const COLOUR_LABELS: Record<string, string> = {
  charcoal: "Charcoal",
  arctic: "Arctic White",
  slate: "Slate",
};

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    redirect("/");
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id);
  } catch {
    redirect("/");
  }

  if (session.payment_status !== "paid") {
    redirect("/");
  }

  const variant = session.metadata?.variant || "freestanding";
  const colour = session.metadata?.colour || "";
  const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00";
  const variantLabel = VARIANT_LABELS[variant] || variant;
  const colourLabel = COLOUR_LABELS[colour] || colour;

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>

        {/* Confirmation */}
        <div className="space-y-2">
          <h1 className="text-2xl font-light tracking-tight">Order confirmed</h1>
          <p className="text-sm text-muted">
            Thank you for your purchase. We&apos;ll be in touch with shipping details.
          </p>
        </div>

        {/* Order details */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 space-y-4 text-left">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Product</span>
              <span>{variantLabel}</span>
            </div>
            {colour && variant === "freestanding" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Colour</span>
                <span>{colourLabel}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted">AI credits</span>
              <span>10 included</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total paid</span>
              <span className="font-medium">&pound;{amount}</span>
            </div>
          </div>
        </div>

        {/* What's next */}
        <div className="bg-surface border border-white/5 rounded-2xl p-6 text-left space-y-4">
          <h2 className="text-sm font-medium">What happens next</h2>
          <div className="space-y-3">
            {[
              "We'll send you a shipping confirmation email when your TouchScreen is on its way.",
              "While you wait, you can start building your dashboard. Your 10 AI credits are ready to use.",
              "When your device arrives, pair it with the companion app and push your dashboard to it.",
            ].map((text, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-accent text-xs font-mono mt-0.5 flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm text-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/app"
          className="block w-full py-4 bg-accent text-black rounded-2xl font-medium text-sm hover:bg-accent/90 transition-colors text-center"
        >
          Start building your dashboard
        </Link>
      </div>
    </main>
  );
}
