import type { WorkspacePoint } from "./workspace-selection";
import type { WorkspaceViewport } from "./workspace-viewport";

export type WorkspaceTouchPoint = WorkspacePoint & {
  pointerId: number;
};

export type WorkspaceTouchPanSession = {
  centroid: WorkspacePoint;
  pointerIds: [number, number];
};

export function getWorkspaceTouchCentroid(
  first: WorkspaceTouchPoint,
  second: WorkspaceTouchPoint,
): WorkspacePoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function startWorkspaceTouchPan(
  points: readonly WorkspaceTouchPoint[],
): WorkspaceTouchPanSession | null {
  if (points.length !== 2) return null;

  const [first, second] = points;
  return {
    centroid: getWorkspaceTouchCentroid(first, second),
    pointerIds: [first.pointerId, second.pointerId],
  };
}

export function moveWorkspaceTouchPan(
  session: WorkspaceTouchPanSession,
  points: ReadonlyMap<number, WorkspaceTouchPoint>,
) {
  const first = points.get(session.pointerIds[0]);
  const second = points.get(session.pointerIds[1]);
  if (!first || !second) return null;

  const centroid = getWorkspaceTouchCentroid(first, second);

  return {
    delta: {
      x: centroid.x - session.centroid.x,
      y: centroid.y - session.centroid.y,
    },
    session: { ...session, centroid },
  };
}

export function panWorkspaceViewportByScreenDelta(
  viewport: WorkspaceViewport,
  delta: WorkspacePoint,
): WorkspaceViewport {
  return {
    x: viewport.x + delta.x,
    y: viewport.y + delta.y,
    zoom: viewport.zoom,
  };
}

export function cancelWorkspaceTouchPan() {
  return null;
}
