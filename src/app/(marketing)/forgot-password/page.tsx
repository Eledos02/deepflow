import { ForgotPasswordPageContent } from "@/components/auth/auth-pages";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Reset your password",
  description: "Request a secure DeepFlow password reset link for your account without revealing whether an email exists.",
  path: "/forgot-password",
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageContent />;
}
