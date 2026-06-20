export const WORKSPACE_VIEWPORT_STORAGE_KEY = "deepflow:workspace-viewport:v1";
export const MIN_WORKSPACE_ZOOM = 0.6;
export const MAX_WORKSPACE_ZOOM = 2;

export type WorkspaceViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type WorkspaceViewportPoint = {
  x: number;
  y: number;
};

export const DEFAULT_WORKSPACE_VIEWPORT: WorkspaceViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function clampWorkspaceZoom(value: number) {
  return Math.min(
    MAX_WORKSPACE_ZOOM,
    Math.max(MIN_WORKSPACE_ZOOM, Math.round(value * 100) / 100),
  );
}

export function parseWorkspaceViewport(value: unknown): WorkspaceViewport {
  if (!value || typeof value !== "object") {
    return DEFAULT_WORKSPACE_VIEWPORT;
  }

  const viewport = value as Partial<WorkspaceViewport>;

  if (
    !isFiniteCoordinate(viewport.x) ||
    !isFiniteCoordinate(viewport.y)
  ) {
    return DEFAULT_WORKSPACE_VIEWPORT;
  }

  return {
    x: Math.round(viewport.x),
    y: Math.round(viewport.y),
    zoom: isFiniteCoordinate(viewport.zoom)
      ? clampWorkspaceZoom(viewport.zoom)
      : DEFAULT_WORKSPACE_VIEWPORT.zoom,
  };
}

export function zoomWorkspaceViewport(
  viewport: WorkspaceViewport,
  requestedZoom: number,
  focalPoint: WorkspaceViewportPoint,
): WorkspaceViewport {
  const zoom = clampWorkspaceZoom(requestedZoom);
  const zoomRatio = zoom / viewport.zoom;

  return {
    x: Math.round(focalPoint.x - (focalPoint.x - viewport.x) * zoomRatio),
    y: Math.round(focalPoint.y - (focalPoint.y - viewport.y) * zoomRatio),
    zoom,
  };
}

export function resetWorkspaceViewport(): WorkspaceViewport {
  return { ...DEFAULT_WORKSPACE_VIEWPORT };
}

export function readWorkspaceViewport(): WorkspaceViewport {
  if (!canUseStorage()) return DEFAULT_WORKSPACE_VIEWPORT;

  try {
    const raw = window.localStorage.getItem(WORKSPACE_VIEWPORT_STORAGE_KEY);
    if (!raw) return DEFAULT_WORKSPACE_VIEWPORT;

    return parseWorkspaceViewport(JSON.parse(raw));
  } catch {
    return DEFAULT_WORKSPACE_VIEWPORT;
  }
}

export function writeWorkspaceViewport(viewport: WorkspaceViewport) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      WORKSPACE_VIEWPORT_STORAGE_KEY,
      JSON.stringify(parseWorkspaceViewport(viewport)),
    );
  } catch {
    // Workspace viewport state is local-first; storage failures should not break panning.
  }
}
