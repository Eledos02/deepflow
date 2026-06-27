"use client";

import { useState } from "react";

import { FocusJournalView } from "@/components/workspace/focus-journal-view";
import { NotesCanvas } from "@/components/workspace/notes-canvas";
import { RoutinesView } from "@/components/workspace/routines-view";
import { useAuth } from "@/features/auth/auth-provider";
import { getWorkspaceGreeting } from "@/features/auth/profile";
import { useCloudSync } from "@/features/sync/cloud-sync-provider";
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
  const { isLoading, profile, user } = useAuth();
  const {
    health,
    restore,
    restoreCloudData,
    isAuthenticated,
    migration,
    saveDeviceDataToAccount,
  } = useCloudSync();
  const greeting =
    user && profile?.displayName
      ? getWorkspaceGreeting(profile.displayName)
      : "A calm canvas for focused thinking.";

  if (isLoading) {
    return (
      <div className="shell workspace-shell">
        <main className="workspace-main">
          <div className="workspace-hero">
            <h1>Checking your Workspace.</h1>
            <p>DeepFlow is loading the right local data for this account.</p>
          </div>
        </main>
      </div>
    );
  }

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
        <div className="workspace-sidebar__sync" data-state={health.kind}>
          <span>{isAuthenticated ? "Cloud sync" : "Local-first"}</span>
          <strong>{health.workspaceStatus}</strong>
          {isAuthenticated &&
          migration.summary.hasData &&
          migration.status !== "completed" ? (
            <button
              disabled={migration.status === "saving"}
              onClick={() => void saveDeviceDataToAccount()}
              type="button"
            >
              {migration.status === "saving" ? "Saving..." : "Save device data"}
            </button>
          ) : null}
          {isAuthenticated && restore.status === "available" ? (
            <button
              onClick={() => void restoreCloudData()}
              type="button"
            >
              Restore cloud data
            </button>
          ) : null}
        </div>
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
