/**
 * How long a till waits for a customer to approve a MoMo prompt.
 *
 * Five minutes, matching the window Hubtel treats as the point at which a
 * callback is considered lost and a status check becomes the fallback.
 *
 * Two minutes was too short: it cut off customers who were still finding their
 * phone or recalling their PIN. Giving up does not cancel the prompt — the
 * customer can still approve afterwards and be charged — so a short wait did
 * not prevent the payment, it only stopped the cashier from seeing it happen.
 *
 * Kept apart from hubtelCollect.ts deliberately: that module talks to Hubtel
 * and uses Buffer, and these constants are imported by client components that
 * should not pull server code into their bundle.
 */
export const MOMO_POLL_INTERVAL_MS = 5000
export const MOMO_POLL_ATTEMPTS = 60 // 60 × 5s = 5 minutes

/** For copy like "Waiting up to 5 minutes…" — derived so it cannot drift. */
export const MOMO_POLL_TIMEOUT_MINUTES = Math.round(
  (MOMO_POLL_ATTEMPTS * MOMO_POLL_INTERVAL_MS) / 60000
)
