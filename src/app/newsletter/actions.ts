"use server";

import { subscribeToNewsletter } from "@/lib/newsletter";

export interface NewsletterFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function subscribeAction(
  _prevState: NewsletterFormState,
  formData: FormData
): Promise<NewsletterFormState> {
  const email = String(formData.get("email") ?? "");
  const result = await subscribeToNewsletter(email);
  if (!result.ok) {
    return { status: "error", message: result.message };
  }
  return { status: "success" };
}
