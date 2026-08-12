const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SubscribeResult {
  ok: boolean;
  message?: string;
}

export async function subscribeToNewsletter(email: string): Promise<SubscribeResult> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter your email address." };
  }
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, message: "That doesn't look like a valid email address." };
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "Newsletter signup isn't configured yet." };
  }

  let response: Response;
  try {
    response = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_address: trimmed }),
    });
  } catch {
    return { ok: false, message: "Network error -- please try again." };
  }

  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 400) {
    const body: unknown = await response.json().catch(() => null);
    const detail = extractErrorMessage(body);
    if (detail && /already|exist/i.test(detail)) {
      return { ok: false, message: "You're already subscribed with that email." };
    }
    return { ok: false, message: detail ?? "That email address couldn't be added." };
  }

  return { ok: false, message: "Something went wrong -- please try again." };
}

// Buttondown returns DRF-style field errors, e.g. {"email_address": ["Someone with
// this email address has already been subscribed."]} -- pull out the first string
// we find rather than depending on the exact shape.
function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  for (const value of Object.values(body as Record<string, unknown>)) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return null;
}
