import { SignupPageContent } from "@/components/auth/auth-pages";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Create your account",
  description: "Create a free DeepFlow account for cloud backup, device restore, and password recovery.",
  path: "/signup",
  index: false,
});

export default function SignupPage() {
  return <SignupPageContent />;
}
