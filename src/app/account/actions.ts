"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface AccountFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

export async function updateNameAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { status: "error", message: "Name is required." };
  }
  if (name.length > 80) {
    return { status: "error", message: "Name must be 80 characters or fewer." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sign in required." };
  }

  const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/account");
  return { status: "success", message: "Name updated." };
}

export async function updatePasswordAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) {
    return { status: "error", message: "Current and new password are required." };
  }
  if (newPassword.length < 6) {
    return { status: "error", message: "New password must be at least 6 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { status: "error", message: "New passwords don't match." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { status: "error", message: "Sign in required." };
  }

  // Re-verify the current password before allowing the change -- prevents
  // a hijacked, still-logged-in session from silently taking over the
  // account just because it has a live cookie.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    return { status: "error", message: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "success", message: "Password updated." };
}

/**
 * Called from the "reset your password" email link flow (no live session
 * beyond the short-lived recovery session created by exchanging the
 * email's code) -- unlike updatePasswordAction, there's no current
 * password to re-verify since clicking the emailed link is the proof of
 * ownership.
 */
export async function setNewPasswordAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    return { status: "error", message: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { status: "error", message: "Passwords don't match." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "That reset link has expired or was already used. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/account");
}

export async function deleteAccountAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const confirmEmail = String(formData.get("confirmEmail") ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { status: "error", message: "Sign in required." };
  }

  if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return { status: "error", message: "Type your email exactly to confirm deletion." };
  }

  // Deleting the auth.users row requires the service-role client; routes
  // the user created are orphaned (created_by set to null), not deleted --
  // see supabase/schema-010-account-management.sql.
  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    return { status: "error", message: error.message };
  }

  await supabase.auth.signOut();
  redirect("/");
}
