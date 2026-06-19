"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { CheckIcon } from "@/components/ui/icons";
import {
  MAX_FREE_WORKSPACE_NOTES,
  canCreateWorkspaceNote,
  createWorkspaceNote,
  deleteWorkspaceNote,
  readWorkspaceNotes,
  updateWorkspaceNote,
  writeWorkspaceNotes,
  type WorkspaceNote,
} from "@/features/workspace/workspace-notes";

const foundingMemberFeatures = [
  "Unlimited Notes",
  "Unlimited Workspaces",
  "Cloud Sync",
  "Focus Journal",
  "Categories & Colors",
  "Search",
  "Export",
  "Advanced Analytics",
  "Founder Badge",
] as const;

type DragState = {
  id: string;
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startX: number;
  startY: number;
};

function getNewNotePosition(count: number) {
  return {
    x: 36 + (count % 4) * 28,
    y: 36 + Math.floor(count / 4) * 28,
  };
}

export function NotesCanvas() {
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const canCreateNote = canCreateWorkspaceNote(notes);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      setNotes(readWorkspaceNotes());
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeWorkspaceNotes(notes);
  }, [hydrated, notes]);

  const addNote = () => {
    if (!canCreateWorkspaceNote(notes)) return;

    setNotes((currentNotes) => [
      ...currentNotes,
      createWorkspaceNote({
        position: getNewNotePosition(currentNotes.length),
      }),
    ]);
  };

  const updateNoteTitle = (id: string, title: string) => {
    setNotes((currentNotes) =>
      updateWorkspaceNote(currentNotes, id, { title }),
    );
  };

  const updateNoteText = (id: string, text: string) => {
    setNotes((currentNotes) =>
      updateWorkspaceNote(currentNotes, id, { text }),
    );
  };

  const removeNote = (id: string) => {
    setNotes((currentNotes) => deleteWorkspaceNote(currentNotes, id));
  };

  const startDrag = (
    event: PointerEvent<HTMLDivElement>,
    note: WorkspaceNote,
  ) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      id: note.id,
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startX: note.x,
      startY: note.y,
    };
  };

  const moveNote = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const nextX = dragState.startX + event.clientX - dragState.startPointerX;
    const nextY = dragState.startY + event.clientY - dragState.startPointerY;

    setNotes((currentNotes) =>
      updateWorkspaceNote(currentNotes, dragState.id, {
        x: nextX,
        y: nextY,
      }),
    );
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
  };

  return (
    <section className="workspace-canvas-card" aria-labelledby="notes-canvas-title">
      <div className="workspace-canvas-card__header">
        <div>
          <span className="eyebrow">Notes Canvas</span>
          <h2 id="notes-canvas-title">Map ideas while your focus session runs.</h2>
          <p>
            Capture thoughts, arrange priorities, and keep lightweight planning
            beside your DeepFlow timers.
          </p>
        </div>
        <button
          className="button button--dark"
          disabled={!canCreateNote}
          onClick={addNote}
          type="button"
        >
          Add note
        </button>
      </div>

      <div className="workspace-canvas-shell">
        <div
          aria-label="Draggable notes canvas"
          className="workspace-canvas"
          data-empty={notes.length === 0}
        >
          {notes.length === 0 ? (
            <div className="workspace-canvas__empty">
              <strong>Start with one note.</strong>
              <p>
                Add a note for a task, idea, research thread, or next action.
                Drag it anywhere on the canvas.
              </p>
            </div>
          ) : null}

          {notes.map((note) => (
            <article
              className="workspace-note"
              key={note.id}
              style={{
                transform: `translate3d(${note.x}px, ${note.y}px, 0)`,
              }}
            >
              <div
                aria-label="Drag note"
                className="workspace-note__handle"
                onPointerCancel={endDrag}
                onPointerDown={(event) => startDrag(event, note)}
                onPointerMove={moveNote}
                onPointerUp={endDrag}
              >
                <span className="workspace-note__grip">
                  <span aria-hidden="true" className="workspace-note__grip-icon" />
                </span>
                <button
                  aria-label="Delete note"
                  onClick={() => removeNote(note.id)}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  Delete
                </button>
              </div>
              <input
                aria-label="Note title"
                className="workspace-note__title"
                maxLength={80}
                onChange={(event) => updateNoteTitle(note.id, event.target.value)}
                value={note.title}
              />
              <textarea
                aria-label={`${note.title} body`}
                maxLength={1_000}
                onChange={(event) => updateNoteText(note.id, event.target.value)}
                value={note.text}
              />
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-plan-row">
        <div>
          <strong>{notes.length} / {MAX_FREE_WORKSPACE_NOTES} notes used</strong>
          <p>Free plan includes one workspace and up to 10 local notes.</p>
        </div>
        {!canCreateNote ? (
          <aside className="workspace-upgrade-card" aria-live="polite">
            <span className="workspace-upgrade-card__badge">Free limit</span>
            <h3>Workspace limit reached</h3>
            <p>
              Free users can create up to 10 notes. Founding Members get
              unlimited notes, unlimited workspaces, cloud sync, advanced
              analytics, and future Workspace features.
            </p>
            <div className="workspace-upgrade-card__features">
              {foundingMemberFeatures.map((feature) => (
                <span key={feature}>
                  <CheckIcon />
                  {feature}
                </span>
              ))}
            </div>
            <Link className="button button--light button--full" href="/pricing#founding-member">
              Become a Founding Member
            </Link>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
