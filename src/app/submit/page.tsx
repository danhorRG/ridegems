import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SubmitForm from "./SubmitForm";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "Submit a route",
  robots: { index: false, follow: false },
};

export default async function SubmitPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/submit");
  }

  return <SubmitForm />;
}
