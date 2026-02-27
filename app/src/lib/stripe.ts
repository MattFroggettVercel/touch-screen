import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});

/**
 * Maps product variants to Stripe Price IDs.
 * These need to be created in the Stripe dashboard and the IDs pasted here.
 */
export const VARIANT_PRICE_MAP: Record<string, string> = {
  freestanding: process.env.STRIPE_PRICE_FREESTANDING || "",
  plaster_in: process.env.STRIPE_PRICE_PLASTER_IN || "",
};

export const VARIANT_LABELS: Record<string, string> = {
  freestanding: "TouchScreen Freestanding",
  plaster_in: "TouchScreen Plaster-in",
};
