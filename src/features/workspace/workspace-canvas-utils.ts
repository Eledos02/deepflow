import type { WorkspaceViewport } from "./workspace-viewport";
import { WORKSPACE_NOTE_HEIGHT, WORKSPACE_NOTE_WIDTH, type WorkspacePoint } from "./workspace-selection";

export type WorkspaceCanvasSize = {
  width: number;
  height: number;
};

export type WorkspaceShortcutTarget = {
  isContentEditable?: boolean;
  role?: string | null;
  tagName?: string;
} | null;

export function canvasPointToWorkspacePoint(
  point: WorkspacePoint,
  viewport: WorkspaceViewport,
): WorkspacePoint {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

export function getWorkspaceViewportCenterPosition(
  canvas: WorkspaceCanvasSize,
  viewport: WorkspaceViewport,
): WorkspacePoint {
  const center = canvasPointToWorkspacePoint(
    { x: canvas.width / 2, y: canvas.height / 2 },
    viewport,
  );

  return {
    x: center.x - WORKSPACE_NOTE_WIDTH / 2,
    y: center.y - WORKSPACE_NOTE_HEIGHT / 2,
  };
}

export function canCreateWorkspaceNoteFromShortcut(
  target: WorkspaceShortcutTarget,
) {
  if (!target) return true;

  const tagName = target.tagName?.toLowerCase();
  return (
    !target.isContentEditable &&
    !["button", "input", "select", "textarea"].includes(tagName ?? "") &&
    target.role !== "menu" &&
    target.role !== "menuitem"
  );
}
