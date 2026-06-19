import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import { NotesCanvas } from "@/components/workspace/notes-canvas";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "DeepFlow Workspace - Notes Canvas",
  description:
    "Open the DeepFlow Workspace MVP with a draggable notes canvas for focus planning, lightweight ideas, and local-first workspace notes.",
  path: "/workspace",
  keywords: ["DeepFlow workspace", "notes canvas", "focus workspace"],
});

const workspaceSections = [
  "Overview",
  "Focus",
  "Goals",
  "Notes Canvas",
  "Insights",
] as const;

export default function WorkspacePage() {
  return (
    <section className="workspace-page">
      <InteractiveBrainwaveBackground />
      <div className="shell workspace-shell">
        <aside className="workspace-sidebar" aria-label="Workspace navigation">
          <div className="workspace-sidebar__header">
            <span className="eyebrow">Workspace</span>
            <strong>DeepFlow</strong>
          </div>
          <nav>
            {workspaceSections.map((section) => (
              <a
                aria-current={section === "Notes Canvas" ? "page" : undefined}
                data-active={section === "Notes Canvas"}
                href={section === "Notes Canvas" ? "#notes-canvas-title" : "#"}
                key={section}
              >
                {section}
                {section !== "Notes Canvas" ? <span>Planned</span> : null}
              </a>
            ))}
          </nav>
        </aside>

        <main className="workspace-main">
          <div className="workspace-hero">
            <h1>A calm canvas for focused thinking.</h1>
            <p>
              Start with draggable notes today. Overview, Focus, Goals, and
              Insights are scaffolded as the foundation for the future
              DeepFlow productivity workspace.
            </p>
          </div>
          <NotesCanvas />
        </main>
      </div>
    </section>
  );
}
