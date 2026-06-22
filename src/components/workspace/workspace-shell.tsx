"use client";

import { useState } from "react";

import { FocusJournalView } from "@/components/workspace/focus-journal-view";
import { NotesCanvas } from "@/components/workspace/notes-canvas";
import { RoutinesView } from "@/components/workspace/routines-view";
import { useAuth } from "@/features/auth/auth-provider";
import { getWorkspaceGreeting } from "@/features/auth/profile";
import {
  WorkspaceGoalsView,
  WorkspaceInsightsView,
  WorkspaceOverviewView,
} from "@/components/workspace/workspace-dashboard-views";

const workspaceSections = [
  "Overview",
  "Focus",
  "Goals",
  "Notes Canvas",
  "Insights",
  "Routines",
] as const;

type WorkspaceSection = (typeof workspaceSections)[number];

export function WorkspaceShell() {
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>("Overview");
  const { profile, user } = useAuth();
  const greeting =
    user && profile?.displayName
      ? getWorkspaceGreeting(profile.displayName)
      : "A calm canvas for focused thinking.";

  return (
    <div className="shell workspace-shell">
      <aside className="workspace-sidebar" aria-label="Workspace navigation">
        <div className="workspace-sidebar__header">
          <span className="eyebrow">Workspace</span>
          <strong>DeepFlow</strong>
        </div>
        <nav>
          {workspaceSections.map((section) => (
            <button
              aria-current={section === activeSection ? "page" : undefined}
              data-active={section === activeSection}
              key={section}
              onClick={() => setActiveSection(section)}
              type="button"
            >
              {section}
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace-main">
        <div className="workspace-hero">
          <h1>{greeting}</h1>
          <p>
            Start with draggable notes today. Focus Journal turns completed
            sessions into a local record of what you finished.
          </p>
        </div>
        {activeSection === "Overview" ? <WorkspaceOverviewView /> : null}
        {activeSection === "Goals" ? <WorkspaceGoalsView /> : null}
        {activeSection === "Notes Canvas" ? <NotesCanvas /> : null}
        {activeSection === "Focus" ? <FocusJournalView /> : null}
        {activeSection === "Insights" ? <WorkspaceInsightsView /> : null}
        {activeSection === "Routines" ? <RoutinesView /> : null}
      </main>
    </div>
  );
}
