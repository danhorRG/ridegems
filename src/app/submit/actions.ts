"use server";

import { submitRoute, type SubmitRouteInput } from "@/lib/submissions";

export interface SubmitFormState {
  status: "idle" | "success" | "error";
  message?: string;
  routeName?: string;
}

export async function submitRoutePayload(input: SubmitRouteInput): Promise<SubmitFormState> {
  const result = await submitRoute(input);
  if (!result.ok) {
    return { status: "error", message: result.message };
  }
  return { status: "success", routeName: result.name };
}
