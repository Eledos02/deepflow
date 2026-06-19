export const WORKSPACE_CONNECTIONS_STORAGE_KEY =
  "deepflow:workspace-connections:v1";
export const MAX_FREE_WORKSPACE_CONNECTIONS = 5;

export const WORKSPACE_CONNECTION_SIDES = [
  "top",
  "right",
  "bottom",
  "left",
] as const;

export type WorkspaceConnectionSide =
  (typeof WORKSPACE_CONNECTION_SIDES)[number];

export type WorkspaceConnection = {
  id: string;
  fromNoteId: string;
  toNoteId: string;
  fromSide?: WorkspaceConnectionSide;
  toSide?: WorkspaceConnectionSide;
  createdAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function createConnectionId(fromNoteId: string, toNoteId: string) {
  return `connection:${fromNoteId}:${toNoteId}`;
}

function isWorkspaceConnectionSide(
  value: unknown,
): value is WorkspaceConnectionSide {
  return (
    typeof value === "string" &&
    WORKSPACE_CONNECTION_SIDES.some((side) => side === value)
  );
}

function isWorkspaceConnection(value: unknown): value is WorkspaceConnection {
  if (!value || typeof value !== "object") return false;

  const connection = value as Partial<WorkspaceConnection>;
  return (
    typeof connection.id === "string" &&
    typeof connection.fromNoteId === "string" &&
    typeof connection.toNoteId === "string" &&
    connection.fromNoteId !== connection.toNoteId &&
    typeof connection.createdAt === "string" &&
    !Number.isNaN(Date.parse(connection.createdAt))
  );
}

function normalizeConnectionPair(fromNoteId: string, toNoteId: string) {
  return [fromNoteId, toNoteId].sort();
}

export function parseWorkspaceConnections(
  value: unknown,
): WorkspaceConnection[] {
  if (!Array.isArray(value)) return [];

  const seenPairs = new Set<string>();

  return value
    .filter(isWorkspaceConnection)
    .map((connection) => ({
      ...connection,
      fromSide: isWorkspaceConnectionSide(connection.fromSide)
        ? connection.fromSide
        : undefined,
      toSide: isWorkspaceConnectionSide(connection.toSide)
        ? connection.toSide
        : undefined,
    }))
    .filter((connection) => {
      const pairKey = normalizeConnectionPair(
        connection.fromNoteId,
        connection.toNoteId,
      ).join(":");
      if (seenPairs.has(pairKey)) return false;
      seenPairs.add(pairKey);
      return true;
    })
    .slice(0, MAX_FREE_WORKSPACE_CONNECTIONS);
}

export function addWorkspaceConnection(
  connections: WorkspaceConnection[],
  fromNoteId: string,
  toNoteId: string,
  fromSide?: WorkspaceConnectionSide,
  toSide?: WorkspaceConnectionSide,
  now = new Date().toISOString(),
) {
  if (fromNoteId === toNoteId) return connections;
  if (connections.length >= MAX_FREE_WORKSPACE_CONNECTIONS) return connections;

  const [firstNoteId, secondNoteId] = normalizeConnectionPair(
    fromNoteId,
    toNoteId,
  );
  const exists = connections.some((connection) => {
    const [existingFirstNoteId, existingSecondNoteId] = normalizeConnectionPair(
      connection.fromNoteId,
      connection.toNoteId,
    );

    return (
      existingFirstNoteId === firstNoteId &&
      existingSecondNoteId === secondNoteId
    );
  });

  if (exists) return connections;

  return [
    ...connections,
    {
      id: createConnectionId(firstNoteId, secondNoteId),
      fromNoteId,
      toNoteId,
      fromSide,
      toSide,
      createdAt: now,
    },
  ];
}

export function canCreateWorkspaceConnection(
  connections: WorkspaceConnection[],
) {
  return connections.length < MAX_FREE_WORKSPACE_CONNECTIONS;
}

export function deleteWorkspaceConnection(
  connections: WorkspaceConnection[],
  id: string,
) {
  return connections.filter((connection) => connection.id !== id);
}

export function removeConnectionsForNote(
  connections: WorkspaceConnection[],
  noteId: string,
) {
  return connections.filter(
    (connection) =>
      connection.fromNoteId !== noteId && connection.toNoteId !== noteId,
  );
}

export function readWorkspaceConnections(): WorkspaceConnection[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(WORKSPACE_CONNECTIONS_STORAGE_KEY);
    if (!raw) return [];
    return parseWorkspaceConnections(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeWorkspaceConnections(connections: WorkspaceConnection[]) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      WORKSPACE_CONNECTIONS_STORAGE_KEY,
      JSON.stringify(parseWorkspaceConnections(connections)),
    );
  } catch {
    // Workspace connections are local-first; storage failures should not break the UI.
  }
}
