import { LoginPageContent } from "@/components/auth/auth-pages";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Sign in",
  description: "Sign in to return to your DeepFlow account and keep your focus identity ready for future sync.",
  path: "/login",
});

export default function LoginPage() {
  return <LoginPageContent />;
}
