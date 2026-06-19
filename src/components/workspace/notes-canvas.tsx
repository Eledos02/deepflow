"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { CheckIcon } from "@/components/ui/icons";
import {
  MAX_FREE_WORKSPACE_CONNECTIONS,
  WORKSPACE_CONNECTION_SIDES,
  addWorkspaceConnection,
  canCreateWorkspaceConnection,
  deleteWorkspaceConnection,
  readWorkspaceConnections,
  removeConnectionsForNote,
  writeWorkspaceConnections,
  type WorkspaceConnectionSide,
  type WorkspaceConnection,
} from "@/features/workspace/workspace-connections";
import {
  MAX_FREE_WORKSPACE_NOTES,
  WORKSPACE_NOTE_COLORS,
  canCreateWorkspaceNote,
  createWorkspaceNote,
  deleteWorkspaceNote,
  readWorkspaceNotes,
  updateWorkspaceNote,
  writeWorkspaceNotes,
  type WorkspaceNoteColor,
  type WorkspaceNote,
} from "@/features/workspace/workspace-notes";

const NOTE_WIDTH = 280;
const NOTE_HEIGHT = 220;

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

type ConnectionSource = {
  noteId: string;
  side: WorkspaceConnectionSide;
};

function getNewNotePosition(count: number) {
  return {
    x: 36 + (count % 4) * 28,
    y: 36 + Math.floor(count / 4) * 28,
  };
}

function getAutoConnectionSide(
  note: WorkspaceNote,
  otherNote: WorkspaceNote,
): WorkspaceConnectionSide {
  const noteCenter = {
    x: note.x + NOTE_WIDTH / 2,
    y: note.y + NOTE_HEIGHT / 2,
  };
  const otherCenter = {
    x: otherNote.x + NOTE_WIDTH / 2,
    y: otherNote.y + NOTE_HEIGHT / 2,
  };
  const deltaX = otherCenter.x - noteCenter.x;
  const deltaY = otherCenter.y - noteCenter.y;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX >= 0 ? "right" : "left";
  }

  return deltaY >= 0 ? "bottom" : "top";
}

function getConnectionAnchor(
  note: WorkspaceNote,
  side: WorkspaceConnectionSide,
) {
  if (side === "top") {
    return { x: note.x + NOTE_WIDTH / 2, y: note.y };
  }

  if (side === "right") {
    return { x: note.x + NOTE_WIDTH, y: note.y + NOTE_HEIGHT / 2 };
  }

  if (side === "bottom") {
    return { x: note.x + NOTE_WIDTH / 2, y: note.y + NOTE_HEIGHT };
  }

  return { x: note.x, y: note.y + NOTE_HEIGHT / 2 };
}

function getConnectionPath(
  fromNote: WorkspaceNote,
  toNote: WorkspaceNote,
  fromSide?: WorkspaceConnectionSide,
  toSide?: WorkspaceConnectionSide,
): { midpoint: { x: number; y: number }; path: string } {
  const resolvedFromSide = fromSide ?? getAutoConnectionSide(fromNote, toNote);
  const resolvedToSide = toSide ?? getAutoConnectionSide(toNote, fromNote);
  const start = getConnectionAnchor(fromNote, resolvedFromSide);
  const end = getConnectionAnchor(toNote, resolvedToSide);
  const fromCenter = {
    x: fromNote.x + NOTE_WIDTH / 2,
    y: fromNote.y + NOTE_HEIGHT / 2,
  };
  const toCenter = {
    x: toNote.x + NOTE_WIDTH / 2,
    y: toNote.y + NOTE_HEIGHT / 2,
  };
  const distanceX = Math.abs(end.x - start.x);
  const distanceY = Math.abs(end.y - start.y);
  const lift = Math.min(90, Math.max(30, distanceX * 0.12 + distanceY * 0.08));
  const controlX = start.x + (end.x - start.x) * 0.5;
  const controlY =
    start.y + (end.y - start.y) * 0.5 - lift * (fromCenter.y <= toCenter.y ? 1 : -0.5);
  const midpoint = {
    x: start.x * 0.25 + controlX * 0.5 + end.x * 0.25,
    y: start.y * 0.25 + controlY * 0.5 + end.y * 0.25,
  };

  return {
    midpoint,
    path: `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`,
  };
}

export function NotesCanvas() {
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [connections, setConnections] = useState<WorkspaceConnection[]>([]);
  const [connectionSource, setConnectionSource] =
    useState<ConnectionSource | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);
  const [hydrated, setHydrated] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const canCreateNote = canCreateWorkspaceNote(notes);
  const canCreateConnection = canCreateWorkspaceConnection(connections);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      setNotes(readWorkspaceNotes());
      setConnections(readWorkspaceConnections());
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeWorkspaceNotes(notes);
  }, [hydrated, notes]);

  useEffect(() => {
    if (!hydrated) return;
    writeWorkspaceConnections(connections);
  }, [connections, hydrated]);

  useEffect(() => {
    if (!selectedConnectionId) return;

    const handleDeleteKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isEditing) return;
      if (event.key !== "Backspace" && event.key !== "Delete") return;

      event.preventDefault();
      setConnections((currentConnections) =>
        deleteWorkspaceConnection(currentConnections, selectedConnectionId),
      );
      setSelectedConnectionId(null);
    };

    window.addEventListener("keydown", handleDeleteKey);

    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [selectedConnectionId]);

  const visibleConnections = useMemo(() => {
    const notesById = new Map(notes.map((note) => [note.id, note]));

    return connections
      .map((connection) => {
        const fromNote = notesById.get(connection.fromNoteId);
        const toNote = notesById.get(connection.toNoteId);

        if (!fromNote || !toNote) return null;

        const geometry = getConnectionPath(
          fromNote,
          toNote,
          connection.fromSide,
          connection.toSide,
        );

        return {
          id: connection.id,
          midpoint: geometry.midpoint,
          path: geometry.path,
        };
      })
      .filter((connection) => connection !== null);
  }, [connections, notes]);

  const selectedConnection = visibleConnections.find(
    (connection) => connection.id === selectedConnectionId,
  );

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

  const updateNoteColor = (id: string, color: WorkspaceNoteColor) => {
    setNotes((currentNotes) =>
      updateWorkspaceNote(currentNotes, id, { color }),
    );
  };

  const removeNote = (id: string) => {
    setNotes((currentNotes) => deleteWorkspaceNote(currentNotes, id));
    setConnections((currentConnections) =>
      removeConnectionsForNote(currentConnections, id),
    );
    setConnectionSource((currentSource) =>
      currentSource?.noteId === id ? null : currentSource,
    );
    setSelectedConnectionId((currentConnectionId) =>
      connections.some(
        (connection) =>
          connection.id === currentConnectionId &&
          (connection.fromNoteId === id || connection.toNoteId === id),
      )
        ? null
        : currentConnectionId,
    );
  };

  const connectNote = (noteId: string, side: WorkspaceConnectionSide) => {
    setConnectionSource((currentSource) => {
      if (!currentSource && !canCreateWorkspaceConnection(connections)) {
        return null;
      }
      if (!currentSource) return { noteId, side };
      if (currentSource.noteId === noteId && currentSource.side === side) {
        return null;
      }
      if (currentSource.noteId === noteId) return { noteId, side };

      setConnections((currentConnections) =>
        addWorkspaceConnection(
          currentConnections,
          currentSource.noteId,
          noteId,
          currentSource.side,
          side,
        ),
      );

      return null;
    });
  };

  const deleteSelectedConnection = () => {
    if (!selectedConnectionId) return;

    setConnections((currentConnections) =>
      deleteWorkspaceConnection(currentConnections, selectedConnectionId),
    );
    setSelectedConnectionId(null);
  };

  const handleConnectionKeyDown = (
    event: KeyboardEvent<SVGPathElement>,
    id: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    setSelectedConnectionId(id);
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
          {visibleConnections.length > 0 ? (
            <svg
              aria-label="Note connections"
              className="workspace-connections"
            >
              {visibleConnections.map((connection) => (
                <path
                  aria-label="Select note connection"
                  d={connection.path}
                  data-selected={selectedConnectionId === connection.id}
                  key={connection.id}
                  onClick={() => setSelectedConnectionId(connection.id)}
                  onKeyDown={(event) =>
                    handleConnectionKeyDown(event, connection.id)
                  }
                  role="button"
                  tabIndex={0}
                />
              ))}
            </svg>
          ) : null}

          {selectedConnection ? (
            <button
              aria-label="Delete selected connection"
              className="workspace-connection-delete"
              onClick={deleteSelectedConnection}
              style={{
                transform: `translate3d(${selectedConnection.midpoint.x}px, ${selectedConnection.midpoint.y}px, 0) translate(-50%, -50%)`,
              }}
              type="button"
            >
              Delete
            </button>
          ) : null}

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
              data-color={note.color}
              key={note.id}
              style={{
                transform: `translate3d(${note.x}px, ${note.y}px, 0)`,
              }}
            >
              <div className="workspace-note__connection-nodes" aria-label="Note connection handles">
                {WORKSPACE_CONNECTION_SIDES.map((side) => (
                  <button
                    aria-label={`Connect from ${side} side`}
                    aria-pressed={
                      connectionSource?.noteId === note.id &&
                      connectionSource.side === side
                    }
                    className="workspace-note__connection-node"
                    data-side={side}
                    key={side}
                    onClick={() => connectNote(note.id, side)}
                    onPointerDown={(event) => event.stopPropagation()}
                    type="button"
                  />
                ))}
              </div>
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
                <div
                  aria-label="Note color"
                  className="workspace-note__colors"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {WORKSPACE_NOTE_COLORS.map((color) => (
                    <button
                      aria-label={`Use ${color.label}`}
                      aria-pressed={note.color === color.id}
                      className="workspace-note__color"
                      data-color={color.id}
                      key={color.id}
                      onClick={() => updateNoteColor(note.id, color.id)}
                      type="button"
                    />
                  ))}
                </div>
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
                placeholder="Name this idea"
                value={note.title}
              />
              <textarea
                aria-label={`${note.title} body`}
                maxLength={1_000}
                onChange={(event) => updateNoteText(note.id, event.target.value)}
                placeholder="Write your thought..."
                value={note.text}
              />
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-plan-row">
        <div>
          <strong>{notes.length} / {MAX_FREE_WORKSPACE_NOTES} notes used</strong>
          <p>
            Free plan includes one workspace, up to 10 local notes, and{" "}
            {MAX_FREE_WORKSPACE_CONNECTIONS} connections.
          </p>
        </div>
        {!canCreateNote || !canCreateConnection ? (
          <aside className="workspace-upgrade-card" aria-live="polite">
            <span className="workspace-upgrade-card__badge">Free limit</span>
            <h3>Workspace limit reached</h3>
            <p>
              Free users can create up to 10 notes and{" "}
              {MAX_FREE_WORKSPACE_CONNECTIONS} connections. Founding Members
              get unlimited notes, unlimited workspaces, cloud sync, advanced
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
