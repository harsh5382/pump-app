// ───────────────────────────────────────────────────────────────────────────
// Browser-side Razorpay Checkout loader.
//
// The sheet is the ONLY place card/UPI details are ever entered — they go
// straight to Razorpay's iframe and never touch Pumpline. All this file does
// is load the script, open the sheet, and hand the signed success payload back
// so the server can verify it.
// ───────────────────────────────────────────────────────────────────────────

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loader: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout is browser-only."));
  }
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("Could not reach Razorpay. Check your connection."));
    };
    if (!existing) document.body.appendChild(script);
  });

  return loader;
}

export interface OpenCheckoutOptions {
  publishableKey: string;
  subscriptionId: string;
  organisationName: string;
  planName: string;
  prefill?: { name?: string; email?: string };
}

export type CheckoutOutcome =
  | { status: "paid"; payload: RazorpaySuccess }
  | { status: "dismissed" }
  | { status: "failed"; message: string };

/** Opens the payment sheet and resolves once the user finishes or dismisses it. */
export async function openSubscriptionCheckout(
  opts: OpenCheckoutOptions,
): Promise<CheckoutOutcome> {
  await loadCheckoutScript();
  const Checkout = window.Razorpay;
  if (!Checkout) throw new Error("Checkout failed to load.");

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const settle = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const rzp = new Checkout({
      key: opts.publishableKey,
      subscription_id: opts.subscriptionId,
      name: opts.organisationName,
      description: `Pumpline ${opts.planName} plan`,
      prefill: opts.prefill ?? {},
      theme: { color: "#0f172a" },
      handler: (response: RazorpaySuccess) => settle({ status: "paid", payload: response }),
      modal: {
        ondismiss: () => settle({ status: "dismissed" }),
      },
    });

    rzp.on("payment.failed", (response: unknown) => {
      const description = (
        response as { error?: { description?: string } } | undefined
      )?.error?.description;
      settle({
        status: "failed",
        message: description ?? "The payment could not be completed.",
      });
    });

    rzp.open();
  });
}
