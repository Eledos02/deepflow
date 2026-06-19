import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "DeepFlow Workspace - Notes Canvas",
  description:
    "Open the DeepFlow Workspace MVP with a draggable notes canvas for focus planning, lightweight ideas, and local-first workspace notes.",
  path: "/workspace",
  keywords: ["DeepFlow workspace", "notes canvas", "focus workspace"],
});

export default function WorkspacePage() {
  return (
    <section className="workspace-page">
      <InteractiveBrainwaveBackground />
      <WorkspaceShell />
    </section>
  );
}
