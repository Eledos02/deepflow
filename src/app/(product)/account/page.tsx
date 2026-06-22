import { AccountPageContent } from "@/components/auth/auth-pages";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Your account",
  description: "Manage your DeepFlow profile, local-first account settings, and future sync foundation.",
  path: "/account",
});

export default function AccountPage() {
  return <AccountPageContent />;
}
