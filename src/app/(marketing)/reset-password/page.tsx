import { ResetPasswordPageContent } from "@/components/auth/auth-pages";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Update your password",
  description: "Choose a new DeepFlow password after opening a valid Supabase Auth password recovery link.",
  path: "/reset-password",
});

export default function ResetPasswordPage() {
  return <ResetPasswordPageContent />;
}
