import { SignupPageContent } from "@/components/auth/auth-pages";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Create your account",
  description: "Create a DeepFlow account for a personal focus identity while your current workspace remains local-first.",
  path: "/signup",
});

export default function SignupPage() {
  return <SignupPageContent />;
}
