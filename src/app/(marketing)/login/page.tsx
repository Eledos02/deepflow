import { LoginPageContent } from "@/components/auth/auth-pages";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Sign in",
  description: "Sign in to return to your DeepFlow account and cloud backup for sessions, routines, and goals.",
  path: "/login",
  index: false,
});

export default function LoginPage() {
  return <LoginPageContent />;
}
