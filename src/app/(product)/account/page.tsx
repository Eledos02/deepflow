import { AccountPageContent } from "@/components/auth/auth-pages";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Your account",
  description: "Manage your DeepFlow profile and cloud backup status for sessions, routines, and goals.",
  path: "/account",
  index: false,
});

export default function AccountPage() {
  return <AccountPageContent />;
}
