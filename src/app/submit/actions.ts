"use server";

import { submitRoute } from "@/lib/submissions";

export interface SubmitFormState {
  status: "idle" | "success" | "error";
  message?: string;
  routeName?: string;
}

export async function submitRouteAction(
  _prevState: SubmitFormState,
  formData: FormData
): Promise<SubmitFormState> {
  const gpxFile = formData.get("gpx");
  if (!(gpxFile instanceof File) || gpxFile.size === 0) {
    return { status: "error", message: "Please choose a GPX file." };
  }

  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const gpxText = await gpxFile.text();

  const result = await submitRoute({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    difficulty: String(formData.get("difficulty") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    whyRecommended: String(formData.get("whyRecommended") ?? ""),
    gpxText,
    photos,
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  return { status: "success", routeName: result.name };
}
