import { redirect } from "next/navigation";
import SubmitForm from "./SubmitForm";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

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
