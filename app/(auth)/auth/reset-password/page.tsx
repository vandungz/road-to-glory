import { ResetPasswordForm } from "./ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <ResetPasswordForm canUpdatePassword={Boolean(user)} />;
}
