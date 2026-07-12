import type { WorkspaceConnectionSide } from "./workspace-connections";
import type { WorkspaceNote } from "./workspace-notes";
import type { WorkspacePoint } from "./workspace-selection";

export type WorkspaceConnectionEndpoint = {
  noteId: string;
  side: WorkspaceConnectionSide;
};

export type WorkspaceConnectionDragSession = {
  pointerId: number;
  previewEnd: WorkspacePoint;
  source: WorkspaceConnectionEndpoint;
  target: WorkspaceConnectionEndpoint | null;
};

export function isCompatibleWorkspaceConnectionTarget(
  source: WorkspaceConnectionEndpoint,
  target: WorkspaceConnectionEndpoint | null,
) {
  return target !== null && source.noteId !== target.noteId;
}

export function startWorkspaceConnectionDrag(
  pointerId: number,
  source: WorkspaceConnectionEndpoint,
  previewEnd: WorkspacePoint,
): WorkspaceConnectionDragSession {
  return { pointerId, previewEnd, source, target: null };
}

export function moveWorkspaceConnectionDrag(
  session: WorkspaceConnectionDragSession,
  previewEnd: WorkspacePoint,
  target: WorkspaceConnectionEndpoint | null,
): WorkspaceConnectionDragSession {
  return {
    ...session,
    previewEnd,
    target: isCompatibleWorkspaceConnectionTarget(session.source, target)
      ? target
      : null,
  };
}

export function completeWorkspaceConnectionDrag(
  session: WorkspaceConnectionDragSession,
) {
  const target = session.target;
  if (!target || session.source.noteId === target.noteId) {
    return null;
  }

  return { source: session.source, target };
}

export function cancelWorkspaceConnectionDrag() {
  return null;
}

export function getWorkspaceConnectionAnchor(
  note: WorkspaceNote,
  side: WorkspaceConnectionSide,
): WorkspacePoint {
  if (side === "top") {
    return { x: note.x + note.width / 2, y: note.y };
  }

  if (side === "right") {
    return { x: note.x + note.width, y: note.y + note.height / 2 };
  }

  if (side === "bottom") {
    return { x: note.x + note.width / 2, y: note.y + note.height };
  }

  return { x: note.x, y: note.y + note.height / 2 };
}

export function getWorkspaceConnectionPreviewPath(
  note: WorkspaceNote,
  side: WorkspaceConnectionSide,
  end: WorkspacePoint,
) {
  const start = getWorkspaceConnectionAnchor(note, side);
  const distanceX = Math.abs(end.x - start.x);
  const distanceY = Math.abs(end.y - start.y);
  const lift = Math.min(90, Math.max(28, distanceX * 0.12 + distanceY * 0.08));
  const controlX = start.x + (end.x - start.x) * 0.5;
  const controlY = start.y + (end.y - start.y) * 0.5 - lift;

  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
}
