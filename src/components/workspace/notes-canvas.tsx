"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { CheckIcon } from "@/components/ui/icons";
import {
  cancelWorkspaceConnectionDrag,
  completeWorkspaceConnectionDrag,
  getWorkspaceConnectionAnchor,
  getWorkspaceConnectionPreviewPath,
  moveWorkspaceConnectionDrag,
  startWorkspaceConnectionDrag,
  type WorkspaceConnectionDragSession,
  type WorkspaceConnectionEndpoint,
} from "@/features/workspace/workspace-connection-interaction";
import {
  MAX_FREE_WORKSPACE_CONNECTIONS,
  WORKSPACE_CONNECTION_SIDES,
  addWorkspaceConnection,
  canCreateWorkspaceConnection,
  deleteWorkspaceConnection,
  readWorkspaceConnections,
  writeWorkspaceConnections,
  type WorkspaceConnectionSide,
  type WorkspaceConnection,
} from "@/features/workspace/workspace-connections";
import {
  MAX_FREE_WORKSPACE_NOTES,
  WORKSPACE_NOTE_COLORS,
  canCreateWorkspaceNote,
  createWorkspaceNote,
  readWorkspaceNotes,
  resizeWorkspaceNoteDimensions,
  updateWorkspaceNote,
  writeWorkspaceNotes,
  type WorkspaceNoteColor,
  type WorkspaceNote,
} from "@/features/workspace/workspace-notes";
import {
  DEFAULT_WORKSPACE_VIEWPORT,
  MAX_WORKSPACE_ZOOM,
  MIN_WORKSPACE_ZOOM,
  readWorkspaceViewport,
  resetWorkspaceViewport,
  startWorkspacePinchGesture,
  updateWorkspacePinchGesture,
  writeWorkspaceViewport,
  zoomWorkspaceViewport,
  type WorkspacePinchGesture,
  type WorkspaceTouchPointer,
  type WorkspaceViewport,
} from "@/features/workspace/workspace-viewport";
import {
  WORKSPACE_NOTE_HEIGHT,
  WORKSPACE_NOTE_WIDTH,
  colorSelectedWorkspaceNotes,
  deleteSelectedWorkspaceNotes,
  moveSelectedWorkspaceNotes,
  normalizeWorkspaceSelectionRect,
  removeConnectionsForSelectedWorkspaceNotes,
  selectWorkspaceNotesInRect,
  toggleWorkspaceNoteSelection,
  type WorkspacePoint,
  type WorkspaceSelectionRect,
} from "@/features/workspace/workspace-selection";
import {
  canCreateWorkspaceNoteFromShortcut,
  canvasPointToWorkspacePoint,
  getWorkspaceViewportCenterPosition,
} from "@/features/workspace/workspace-canvas-utils";

const foundingMemberFeatures = [
  "Expanded Notes",
  "More Workspace Capacity",
  "Account Cloud Backup",
  "Focus Journal",
  "Categories & Colors",
  "Search",
  "Export",
  "Deeper Insights",
  "Founder Updates",
] as const;

type DragState = {
  element: HTMLDivElement;
  noteIds: string[];
  notes: WorkspaceNote[];
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
};

type ResizeState = {
  element: HTMLButtonElement;
  noteId: string;
  pointerId: number;
  startHeight: number;
  startPointerX: number;
  startPointerY: number;
  startWidth: number;
};

type SelectionBoxState = WorkspaceSelectionRect & {
  pointerId: number;
};

type ConnectionCaptureState = {
  element: HTMLButtonElement;
  session: WorkspaceConnectionDragSession;
};

type PanState = {
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startViewportX: number;
  startViewportY: number;
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
    x: note.x + note.width / 2,
    y: note.y + note.height / 2,
  };
  const otherCenter = {
    x: otherNote.x + otherNote.width / 2,
    y: otherNote.y + otherNote.height / 2,
  };
  const deltaX = otherCenter.x - noteCenter.x;
  const deltaY = otherCenter.y - noteCenter.y;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX >= 0 ? "right" : "left";
  }

  return deltaY >= 0 ? "bottom" : "top";
}

function getConnectionPath(
  fromNote: WorkspaceNote,
  toNote: WorkspaceNote,
  fromSide?: WorkspaceConnectionSide,
  toSide?: WorkspaceConnectionSide,
): { midpoint: { x: number; y: number }; path: string } {
  const resolvedFromSide = fromSide ?? getAutoConnectionSide(fromNote, toNote);
  const resolvedToSide = toSide ?? getAutoConnectionSide(toNote, fromNote);
  const start = getWorkspaceConnectionAnchor(fromNote, resolvedFromSide);
  const end = getWorkspaceConnectionAnchor(toNote, resolvedToSide);
  const fromCenter = {
    x: fromNote.x + fromNote.width / 2,
    y: fromNote.y + fromNote.height / 2,
  };
  const toCenter = {
    x: toNote.x + toNote.width / 2,
    y: toNote.y + toNote.height / 2,
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
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<WorkspaceViewport>(
    DEFAULT_WORKSPACE_VIEWPORT,
  );
  const [connectionDragSession, setConnectionDragSession] =
    useState<WorkspaceConnectionDragSession | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);
  const [hydrated, setHydrated] = useState(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isMultiColorPaletteOpen, setIsMultiColorPaletteOpen] =
    useState(false);
  const [enteringNoteIds, setEnteringNoteIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState | null>(
    null,
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const activeTouchPointersRef = useRef(
    new Map<number, WorkspaceTouchPointer>(),
  );
  const pinchGestureRef = useRef<WorkspacePinchGesture | null>(null);
  const connectionDragRef = useRef<ConnectionCaptureState | null>(null);
  const expandedScrollPositionRef = useRef({ x: 0, y: 0 });
  const selectionBoxRef = useRef<SelectionBoxState | null>(null);
  const selectedNoteIdsRef = useRef<string[]>([]);
  const noteTitleRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocusNoteIdRef = useRef<string | null>(null);
  const viewportRef = useRef<WorkspaceViewport>(DEFAULT_WORKSPACE_VIEWPORT);
  const spacePressedRef = useRef(false);
  const canCreateNote = canCreateWorkspaceNote(notes);
  const canCreateConnection = canCreateWorkspaceConnection(connections);
  const hasMultiSelection = selectedNoteIds.length >= 2;
  const canDuplicateSelection =
    hasMultiSelection &&
    notes.length + selectedNoteIds.length <= MAX_FREE_WORKSPACE_NOTES;
  const isViewportDefault =
    viewport.x === DEFAULT_WORKSPACE_VIEWPORT.x &&
    viewport.y === DEFAULT_WORKSPACE_VIEWPORT.y &&
    viewport.zoom === DEFAULT_WORKSPACE_VIEWPORT.zoom;

  const setNoteSelection = useCallback((noteIds: string[]) => {
    const nextSelection = [...new Set(noteIds)];
    selectedNoteIdsRef.current = nextSelection;
    setSelectedNoteIds(nextSelection);
    if (nextSelection.length < 2) setIsMultiColorPaletteOpen(false);
  }, []);

  const applyViewport = useCallback((nextViewport: WorkspaceViewport) => {
    viewportRef.current = nextViewport;

    if (worldRef.current) {
      worldRef.current.style.transform = `translate3d(${nextViewport.x}px, ${nextViewport.y}px, 0) scale(${nextViewport.zoom})`;
    }
  }, []);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      setNotes(readWorkspaceNotes());
      setConnections(readWorkspaceConnections());
      const storedViewport = readWorkspaceViewport();
      viewportRef.current = storedViewport;
      setViewport(storedViewport);
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
    applyViewport(viewport);
  }, [applyViewport, viewport]);

  useEffect(() => {
    if (!hydrated) return;
    writeWorkspaceViewport(viewport);
  }, [hydrated, viewport]);

  useEffect(() => {
    const noteId = pendingFocusNoteIdRef.current;
    if (!noteId) return;

    const frameId = window.requestAnimationFrame(() => {
      noteTitleRefs.current.get(noteId)?.focus();
      pendingFocusNoteIdRef.current = null;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [notes]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== " ") return;

      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isEditing) return;
      spacePressedRef.current = true;
    };
    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.key === " ") spacePressedRef.current = false;
    };
    const releaseSpace = () => {
      spacePressedRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseSpace);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseSpace);
    };
  }, []);

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
  const selectionBounds = selectionBox
    ? normalizeWorkspaceSelectionRect(selectionBox)
    : null;
  const connectionPreviewPath = useMemo(() => {
    if (!connectionDragSession) return null;

    const sourceNote = notes.find(
      (note) => note.id === connectionDragSession.source.noteId,
    );
    if (!sourceNote) return null;

    return getWorkspaceConnectionPreviewPath(
      sourceNote,
      connectionDragSession.source.side,
      connectionDragSession.previewEnd,
    );
  }, [connectionDragSession, notes]);

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
    const noteIds = selectedNoteIdsRef.current.includes(id)
      ? selectedNoteIdsRef.current
      : [id];

    setNotes((currentNotes) =>
      colorSelectedWorkspaceNotes(currentNotes, noteIds, color),
    );
  };

  const updateSelectedNoteColor = (color: WorkspaceNoteColor) => {
    const noteIds = selectedNoteIdsRef.current;
    if (noteIds.length < 2) return;

    setNotes((currentNotes) =>
      colorSelectedWorkspaceNotes(currentNotes, noteIds, color),
    );
    setIsMultiColorPaletteOpen(false);
  };

  const duplicateSelectedNotes = () => {
    const noteIds = selectedNoteIdsRef.current;
    if (
      noteIds.length < 2 ||
      notes.length + noteIds.length > MAX_FREE_WORKSPACE_NOTES
    ) {
      return;
    }

    const selectedIds = new Set(noteIds);
    const copies = notes
      .filter((note) => selectedIds.has(note.id))
      .map((note) =>
        createWorkspaceNote({
          color: note.color,
          height: note.height,
          position: { x: note.x + 28, y: note.y + 28 },
          text: note.text,
          title: note.title,
          width: note.width,
        }),
      );

    setNotes((currentNotes) => [...currentNotes, ...copies]);
    pendingFocusNoteIdRef.current = copies[0]?.id ?? null;
    setEnteringNoteIds((currentIds) => [
      ...new Set([...currentIds, ...copies.map((note) => note.id)]),
    ]);
    setNoteSelection(copies.map((note) => note.id));
  };

  const removeNotes = useCallback((noteIds: string[]) => {
    if (noteIds.length === 0) return;

    setNotes((currentNotes) =>
      deleteSelectedWorkspaceNotes(currentNotes, noteIds),
    );
    setConnections((currentConnections) =>
      removeConnectionsForSelectedWorkspaceNotes(currentConnections, noteIds),
    );
    const connectionCapture = connectionDragRef.current;
    if (
      connectionCapture &&
      noteIds.includes(connectionCapture.session.source.noteId)
    ) {
      connectionDragRef.current = null;
      setConnectionDragSession(null);
    }
    setSelectedConnectionId(null);
    setNoteSelection([]);
  }, [setNoteSelection]);

  const removeNote = (id: string) => {
    removeNotes([id]);
  };

  const selectNote = (noteId: string, shiftKey: boolean) => {
    const currentSelection = selectedNoteIdsRef.current;

    if (shiftKey) {
      setNoteSelection(toggleWorkspaceNoteSelection(currentSelection, noteId));
      return;
    }

    if (!currentSelection.includes(noteId)) {
      setNoteSelection([noteId]);
    }
  };

  const handleNotePointerDown = (
    event: PointerEvent<HTMLElement>,
    noteId: string,
  ) => {
    const target = event.target;
    const startedOnControl =
      target instanceof Element &&
      target.closest("button, input, textarea, select, a");

    if (startedOnControl) return;
    selectNote(noteId, event.shiftKey);
  };

  const getConnectionEndpointAtClientPoint = (
    clientX: number,
    clientY: number,
  ): WorkspaceConnectionEndpoint | null => {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLButtonElement>(
        "[data-connection-note-id][data-connection-side]",
      );
    const noteId = target?.dataset.connectionNoteId;
    const side = target?.dataset.connectionSide;

    if (
      !noteId ||
      !side ||
      !WORKSPACE_CONNECTION_SIDES.includes(side as WorkspaceConnectionSide)
    ) {
      return null;
    }

    return { noteId, side: side as WorkspaceConnectionSide };
  };

  const getConnectionDragUpdate = (
    session: WorkspaceConnectionDragSession,
    clientX: number,
    clientY: number,
  ) => {
    const pointerPoint = getWorldPointFromClient(clientX, clientY);
    if (!pointerPoint) return session;

    const target = getConnectionEndpointAtClientPoint(clientX, clientY);
    const targetNote = target
      ? notes.find((note) => note.id === target.noteId)
      : null;
    const previewEnd = targetNote && target
      ? getWorkspaceConnectionAnchor(targetNote, target.side)
      : pointerPoint;

    return moveWorkspaceConnectionDrag(session, previewEnd, target);
  };

  const cancelActiveConnection = useCallback(() => {
    const connectionCapture = connectionDragRef.current;
    if (
      connectionCapture?.element.hasPointerCapture(
        connectionCapture.session.pointerId,
      )
    ) {
      connectionCapture.element.releasePointerCapture(
        connectionCapture.session.pointerId,
      );
    }

    connectionDragRef.current = cancelWorkspaceConnectionDrag();
    setConnectionDragSession(cancelWorkspaceConnectionDrag());
  }, []);

  const startConnectionDrag = (
    event: PointerEvent<HTMLButtonElement>,
    noteId: string,
    side: WorkspaceConnectionSide,
  ) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    if (!canCreateWorkspaceConnection(connections)) return;

    const source = { noteId, side };
    const previewPoint = getWorldPointFromClient(event.clientX, event.clientY);
    if (!previewPoint) return;

    const session = startWorkspaceConnectionDrag(
      event.pointerId,
      source,
      previewPoint,
    );
    event.currentTarget.setPointerCapture(event.pointerId);
    connectionDragRef.current = { element: event.currentTarget, session };
    setConnectionDragSession(session);
  };

  const moveConnectionDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const connectionCapture = connectionDragRef.current;
    if (
      !connectionCapture ||
      connectionCapture.session.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const session = getConnectionDragUpdate(
      connectionCapture.session,
      event.clientX,
      event.clientY,
    );
    connectionCapture.session = session;
    setConnectionDragSession(session);
  };

  const endConnectionDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const connectionCapture = connectionDragRef.current;
    if (
      !connectionCapture ||
      connectionCapture.session.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const session = getConnectionDragUpdate(
      connectionCapture.session,
      event.clientX,
      event.clientY,
    );
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    connectionDragRef.current = null;
    setConnectionDragSession(null);

    const completed = completeWorkspaceConnectionDrag(session);
    if (completed) {
      setConnections((currentConnections) =>
        addWorkspaceConnection(
          currentConnections,
          completed.source.noteId,
          completed.target.noteId,
          completed.source.side,
          completed.target.side,
        ),
      );
    }
  };

  const cancelConnectionDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (connectionDragRef.current?.session.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    cancelActiveConnection();
  };

  const deleteSelectedConnection = () => {
    if (!selectedConnectionId) return;

    setConnections((currentConnections) =>
      deleteWorkspaceConnection(currentConnections, selectedConnectionId),
    );
    setSelectedConnectionId(null);
  };

  useEffect(() => {
    const handleSelectionKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && connectionDragRef.current) {
        event.preventDefault();
        cancelActiveConnection();
        return;
      }

      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isEditing) return;

      if (event.key === "Escape") {
        setNoteSelection([]);
        selectionBoxRef.current = null;
        setSelectionBox(null);
        return;
      }

      if (event.key !== "Backspace" && event.key !== "Delete") return;

      const currentSelection = selectedNoteIdsRef.current;
      if (currentSelection.length > 0) {
        event.preventDefault();
        removeNotes(currentSelection);
        return;
      }

      if (!selectedConnectionId) return;

      event.preventDefault();
      setConnections((currentConnections) =>
        deleteWorkspaceConnection(currentConnections, selectedConnectionId),
      );
      setSelectedConnectionId(null);
    };

    window.addEventListener("keydown", handleSelectionKeyDown);

    return () => window.removeEventListener("keydown", handleSelectionKeyDown);
  }, [
    cancelActiveConnection,
    removeNotes,
    selectedConnectionId,
    setNoteSelection,
  ]);

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
    if (event.button !== 0 || event.shiftKey) return;

    const noteIds = selectedNoteIdsRef.current.includes(note.id)
      ? selectedNoteIdsRef.current
      : [note.id];

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      element: event.currentTarget,
      noteIds,
      notes,
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
    };
  };

  const moveNote = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const zoom = viewportRef.current.zoom;
    setNotes(
      moveSelectedWorkspaceNotes(dragState.notes, dragState.noteIds, {
        x: (event.clientX - dragState.startPointerX) / zoom,
        y: (event.clientY - dragState.startPointerY) / zoom,
      }),
    );
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
  };

  const startResize = (
    event: PointerEvent<HTMLButtonElement>,
    note: WorkspaceNote,
  ) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    selectNote(note.id, false);
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStateRef.current = {
      element: event.currentTarget,
      noteId: note.id,
      pointerId: event.pointerId,
      startHeight: note.height,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startWidth: note.width,
    };
  };

  const resizeNote = (event: PointerEvent<HTMLButtonElement>) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    const dimensions = resizeWorkspaceNoteDimensions({
      width: resizeState.startWidth,
      height: resizeState.startHeight,
      deltaX: event.clientX - resizeState.startPointerX,
      deltaY: event.clientY - resizeState.startPointerY,
      zoom: viewportRef.current.zoom,
    });
    setNotes((currentNotes) =>
      updateWorkspaceNote(currentNotes, resizeState.noteId, dimensions),
    );
  };

  const endResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizeStateRef.current = null;
  };

  const getWorldPointFromClient = useCallback((
    clientX: number,
    clientY: number,
  ): WorkspacePoint | null => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return null;

    return canvasPointToWorkspacePoint(
      { x: clientX - bounds.left, y: clientY - bounds.top },
      viewportRef.current,
    );
  }, []);

  const getWorldPoint = (
    event: PointerEvent<HTMLDivElement>,
  ): WorkspacePoint | null =>
    getWorldPointFromClient(event.clientX, event.clientY);

  const createNoteAtPosition = useCallback((position: WorkspacePoint) => {
    if (!canCreateWorkspaceNote(notes)) return;

    const note = createWorkspaceNote({ position });
    pendingFocusNoteIdRef.current = note.id;
    setEnteringNoteIds((currentIds) => [...new Set([...currentIds, note.id])]);
    setNotes((currentNotes) => [...currentNotes, note]);
    setNoteSelection([note.id]);
  }, [notes, setNoteSelection]);

  const createNoteAtViewportCenter = useCallback(() => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    createNoteAtPosition(
      getWorkspaceViewportCenterPosition(
        { width: bounds.width, height: bounds.height },
        viewportRef.current,
      ),
    );
  }, [createNoteAtPosition]);

  const addNote = () => {
    createNoteAtPosition(getNewNotePosition(notes.length));
  };

  const handleCanvasDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    const startedOnCanvasSurface =
      target === canvasRef.current || target === worldRef.current;
    if (!startedOnCanvasSurface) return;

    const position = getWorldPointFromClient(event.clientX, event.clientY);
    if (!position) return;

    event.preventDefault();
    createNoteAtPosition(position);
  };

  useEffect(() => {
    const handleNewNoteShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== "n" || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target;
      const shortcutTarget =
        target instanceof HTMLElement
          ? {
              isContentEditable: target.isContentEditable,
              role: target.getAttribute("role"),
              tagName: target.tagName,
            }
          : null;

      if (!canCreateWorkspaceNoteFromShortcut(shortcutTarget)) return;

      event.preventDefault();
      createNoteAtViewportCenter();
    };

    window.addEventListener("keydown", handleNewNoteShortcut);

    return () => window.removeEventListener("keydown", handleNewNoteShortcut);
  }, [createNoteAtViewportCenter]);

  const startSelectionBox = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.pointerType === "touch") return;

    const target = event.target;
    const startedOnCanvasSurface =
      target === canvasRef.current || target === worldRef.current;
    if (!startedOnCanvasSurface) return;

    const start = getWorldPoint(event);
    if (!start) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const nextSelectionBox = {
      pointerId: event.pointerId,
      start,
      end: start,
    };
    selectionBoxRef.current = nextSelectionBox;
    setSelectionBox(nextSelectionBox);
    setNoteSelection([]);
  };

  const moveSelectionBox = (event: PointerEvent<HTMLDivElement>) => {
    const currentSelectionBox = selectionBoxRef.current;
    if (
      !currentSelectionBox ||
      currentSelectionBox.pointerId !== event.pointerId
    ) {
      return;
    }

    const end = getWorldPoint(event);
    if (!end) return;

    const nextSelectionBox = { ...currentSelectionBox, end };
    selectionBoxRef.current = nextSelectionBox;
    setSelectionBox(nextSelectionBox);
  };

  const endSelectionBox = (event: PointerEvent<HTMLDivElement>) => {
    const currentSelectionBox = selectionBoxRef.current;
    if (
      !currentSelectionBox ||
      currentSelectionBox.pointerId !== event.pointerId
    ) {
      return;
    }

    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    const end = getWorldPoint(event) ?? currentSelectionBox.end;
    setNoteSelection(
      selectWorkspaceNotesInRect(notes, { ...currentSelectionBox, end }),
    );
    selectionBoxRef.current = null;
    setSelectionBox(null);
  };

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    const shouldPanWithSpace = event.button === 0 && spacePressedRef.current;
    const shouldPanWithMiddleButton = event.button === 1;
    const target = event.target;
    const startedOnCanvasSurface =
      target === canvasRef.current || target === worldRef.current;
    const shouldPanExpandedTouch =
      isCanvasExpanded &&
      event.pointerType === "touch" &&
      event.button === 0 &&
      startedOnCanvasSurface;
    const startedOnControl =
      target instanceof Element &&
      target.closest("button, input, textarea, select, a");

    if (
      (!shouldPanWithSpace &&
        !shouldPanWithMiddleButton &&
        !shouldPanExpandedTouch) ||
      startedOnControl
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    canvasRef.current?.setPointerCapture(event.pointerId);
    panStateRef.current = {
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startViewportX: viewportRef.current.x,
      startViewportY: viewportRef.current.y,
    };
    setIsPanning(true);
  };

  const panCanvas = (event: PointerEvent<HTMLDivElement>) => {
    const panState = panStateRef.current;
    if (!panState || panState.pointerId !== event.pointerId) return;

    event.preventDefault();
    applyViewport({
      x: Math.round(
        panState.startViewportX + event.clientX - panState.startPointerX,
      ),
      y: Math.round(
        panState.startViewportY + event.clientY - panState.startPointerY,
      ),
      zoom: viewportRef.current.zoom,
    });
  };

  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    const panState = panStateRef.current;
    if (!panState || panState.pointerId !== event.pointerId) return;

    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    panStateRef.current = null;
    setViewport(viewportRef.current);
    setIsPanning(false);
  };

  const releaseCanvasPointerCapture = (pointerId: number) => {
    if (canvasRef.current?.hasPointerCapture(pointerId)) {
      canvasRef.current.releasePointerCapture(pointerId);
    }
  };

  const getCanvasCenter = useCallback(() => {
    const bounds = canvasRef.current?.getBoundingClientRect();

    return {
      x: bounds ? bounds.width / 2 : 0,
      y: bounds ? bounds.height / 2 : 0,
    };
  }, []);

  const setZoom = useCallback((
    requestedZoom: number,
    focalPoint = getCanvasCenter(),
  ) => {
    const nextViewport = zoomWorkspaceViewport(
      viewportRef.current,
      requestedZoom,
      focalPoint,
    );

    applyViewport(nextViewport);
    setViewport(nextViewport);
  }, [applyViewport, getCanvasCenter]);

  const resetViewport = () => {
    const defaultViewport = resetWorkspaceViewport();
    applyViewport(defaultViewport);
    setViewport(defaultViewport);
  };

  const releaseCanvasInteractions = useCallback(
    (preserveTouchPointers = false) => {
      const dragState = dragStateRef.current;
      if (dragState?.element.hasPointerCapture(dragState.pointerId)) {
        dragState.element.releasePointerCapture(dragState.pointerId);
      }
      dragStateRef.current = null;

      const resizeState = resizeStateRef.current;
      if (resizeState?.element.hasPointerCapture(resizeState.pointerId)) {
        resizeState.element.releasePointerCapture(resizeState.pointerId);
      }
      resizeStateRef.current = null;

      if (connectionDragRef.current) cancelActiveConnection();

      const selectionBoxState = selectionBoxRef.current;
      if (selectionBoxState) {
        releaseCanvasPointerCapture(selectionBoxState.pointerId);
      }
      selectionBoxRef.current = null;
      setSelectionBox(null);

      const panState = panStateRef.current;
      if (panState) releaseCanvasPointerCapture(panState.pointerId);
      panStateRef.current = null;
      setViewport(viewportRef.current);
      setIsPanning(false);

      if (!preserveTouchPointers) {
        for (const pointerId of activeTouchPointersRef.current.keys()) {
          releaseCanvasPointerCapture(pointerId);
        }
        activeTouchPointersRef.current.clear();
        pinchGestureRef.current = null;
      }
    },
    [cancelActiveConnection],
  );

  const getCanvasTouchPointer = (
    event: PointerEvent<HTMLDivElement>,
  ): WorkspaceTouchPointer | null => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return null;

    return {
      pointerId: event.pointerId,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const startCanvasTouchGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (!isCanvasExpanded || event.pointerType !== "touch") return false;

    const activePointers = activeTouchPointersRef.current;
    if (activePointers.size >= 2 && !activePointers.has(event.pointerId)) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    const pointer = getCanvasTouchPointer(event);
    if (!pointer) return false;
    activePointers.set(event.pointerId, pointer);
    if (activePointers.size < 2) return false;

    const gesture = startWorkspacePinchGesture(
      [...activePointers.values()],
      viewportRef.current,
    );
    if (!gesture) return false;

    event.preventDefault();
    event.stopPropagation();
    releaseCanvasInteractions(true);
    pinchGestureRef.current = gesture;
    try {
      for (const pointerId of gesture.pointerIds) {
        canvasRef.current?.setPointerCapture(pointerId);
      }
    } catch {
      for (const pointerId of gesture.pointerIds) {
        releaseCanvasPointerCapture(pointerId);
      }
      activePointers.clear();
      pinchGestureRef.current = null;
      setIsPanning(false);
      return true;
    }
    setIsPanning(true);
    return true;
  };

  const moveCanvasTouchGesture = (event: PointerEvent<HTMLDivElement>) => {
    const activePointers = activeTouchPointersRef.current;
    if (event.pointerType !== "touch" || !activePointers.has(event.pointerId)) {
      return pinchGestureRef.current !== null;
    }

    const pointer = getCanvasTouchPointer(event);
    if (pointer) activePointers.set(event.pointerId, pointer);

    const gesture = pinchGestureRef.current;
    if (!gesture) return false;

    event.preventDefault();
    event.stopPropagation();
    const nextViewport = updateWorkspacePinchGesture(
      gesture,
      [...activePointers.values()],
    );
    if (nextViewport) applyViewport(nextViewport);
    return true;
  };

  const endCanvasTouchGesture = (event: PointerEvent<HTMLDivElement>) => {
    const activePointers = activeTouchPointersRef.current;
    const wasTracked = activePointers.has(event.pointerId);
    const gesture = pinchGestureRef.current;
    const wasPinching = gesture !== null;

    if (!wasTracked) return wasPinching;
    activePointers.delete(event.pointerId);
    if (!wasPinching) return false;

    event.preventDefault();
    event.stopPropagation();
    for (const pointerId of gesture.pointerIds) {
      releaseCanvasPointerCapture(pointerId);
    }
    pinchGestureRef.current = null;
    setViewport(viewportRef.current);
    setIsPanning(false);
    return true;
  };

  const minimizeCanvas = useCallback(() => {
    releaseCanvasInteractions();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsCanvasExpanded(false);
  }, [releaseCanvasInteractions]);

  const expandCanvas = useCallback(() => {
    expandedScrollPositionRef.current = {
      x: window.scrollX,
      y: window.scrollY,
    };
    setIsCanvasExpanded(true);
  }, []);

  useEffect(() => {
    if (!isCanvasExpanded) return;

    const root = document.documentElement;
    const body = document.body;
    const { x: scrollX, y: scrollY } = expandedScrollPositionRef.current;
    const hadExpandedClass = body.classList.contains("workspace-canvas-expanded");
    const expandedRoot = body.querySelector<HTMLElement>(
      ':scope > .workspace-canvas-card[data-expanded="true"]',
    );
    const backgroundElements = [...body.children]
      .filter((element) => element !== expandedRoot && element.tagName !== "SCRIPT")
      .map((element) => ({
        ariaHidden: element.getAttribute("aria-hidden"),
        element: element as HTMLElement,
        inert: (element as HTMLElement).inert,
      }));
    const previousRootOverflow = root.style.overflow;
    const previousRootScrollBehavior = root.style.scrollBehavior;
    const previousBodyStyles = {
      left: body.style.left,
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    root.style.overflow = "hidden";
    root.style.scrollBehavior = "auto";
    body.classList.add("workspace-canvas-expanded");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    for (const background of backgroundElements) {
      background.element.inert = true;
      background.element.setAttribute("aria-hidden", "true");
    }

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.width = previousBodyStyles.width;
      body.style.overflow = previousBodyStyles.overflow;
      if (!hadExpandedClass) body.classList.remove("workspace-canvas-expanded");
      for (const background of backgroundElements) {
        background.element.inert = background.inert;
        if (background.ariaHidden === null) {
          background.element.removeAttribute("aria-hidden");
        } else {
          background.element.setAttribute("aria-hidden", background.ariaHidden);
        }
      }
      const restoreScrollPosition = () => {
        const currentScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo(scrollX, scrollY);
        root.scrollLeft = scrollX;
        root.scrollTop = scrollY;
        body.scrollLeft = scrollX;
        body.scrollTop = scrollY;
        root.style.scrollBehavior = currentScrollBehavior;
      };

      restoreScrollPosition();
      root.style.scrollBehavior = previousRootScrollBehavior;
      window.requestAnimationFrame(() => {
        if (body.classList.contains("workspace-canvas-expanded")) return;
        restoreScrollPosition();
        window.requestAnimationFrame(() => {
          if (body.classList.contains("workspace-canvas-expanded")) return;
          restoreScrollPosition();
        });
      });
      window.setTimeout(() => {
        if (body.classList.contains("workspace-canvas-expanded")) return;
        restoreScrollPosition();
        window.requestAnimationFrame(restoreScrollPosition);
      }, 120);
    };
  }, [isCanvasExpanded]);

  useEffect(() => {
    if (!isCanvasExpanded) return;

    const handleExpandedCanvasKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      minimizeCanvas();
    };

    window.addEventListener("keydown", handleExpandedCanvasKeyDown);
    return () =>
      window.removeEventListener("keydown", handleExpandedCanvasKeyDown);
  }, [isCanvasExpanded, minimizeCanvas]);

  useEffect(() => () => {
    const dragState = dragStateRef.current;
    if (dragState?.element.hasPointerCapture(dragState.pointerId)) {
      dragState.element.releasePointerCapture(dragState.pointerId);
    }
    const resizeState = resizeStateRef.current;
    if (resizeState?.element.hasPointerCapture(resizeState.pointerId)) {
      resizeState.element.releasePointerCapture(resizeState.pointerId);
    }
    const connectionCapture = connectionDragRef.current;
    if (
      connectionCapture?.element.hasPointerCapture(
        connectionCapture.session.pointerId,
      )
    ) {
      connectionCapture.element.releasePointerCapture(
        connectionCapture.session.pointerId,
      );
    }
    const panState = panStateRef.current;
    if (panState && canvasRef.current?.hasPointerCapture(panState.pointerId)) {
      canvasRef.current.releasePointerCapture(panState.pointerId);
    }
    const selectionBoxState = selectionBoxRef.current;
    if (
      selectionBoxState &&
      canvasRef.current?.hasPointerCapture(selectionBoxState.pointerId)
    ) {
      canvasRef.current.releasePointerCapture(selectionBoxState.pointerId);
    }
    for (const pointerId of activeTouchPointersRef.current.keys()) {
      if (canvasRef.current?.hasPointerCapture(pointerId)) {
        canvasRef.current.releasePointerCapture(pointerId);
      }
    }
    activeTouchPointersRef.current.clear();
    pinchGestureRef.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasWheel = (event: globalThis.WheelEvent) => {
      if (!event.ctrlKey) return;

      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      const requestedZoom =
        viewportRef.current.zoom * Math.exp(-event.deltaY * 0.001);

      setZoom(requestedZoom, {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    };

    canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });

    return () => canvas.removeEventListener("wheel", handleCanvasWheel);
  }, [setZoom]);

  const canvasCard = (
    <section
      aria-labelledby="notes-canvas-title"
      className="workspace-canvas-card"
      data-expanded={isCanvasExpanded}
    >
      {isCanvasExpanded ? (
        <div
          aria-label="Expanded Canvas controls"
          className="workspace-canvas__expanded-toolbar"
          role="toolbar"
        >
          <strong id="notes-canvas-title">Notes Canvas</strong>
          <div className="workspace-canvas__expanded-actions">
            <button
              className="button button--dark"
              disabled={!canCreateNote}
              onClick={addNote}
              type="button"
            >
              Add note
            </button>
            <button
              aria-label="Zoom out"
              disabled={viewport.zoom <= MIN_WORKSPACE_ZOOM}
              onClick={() => setZoom(viewportRef.current.zoom - 0.1)}
              type="button"
            >
              <span aria-hidden="true">-</span>
            </button>
            <output aria-live="polite">
              {Math.round(viewport.zoom * 100)}%
            </output>
            <button
              aria-label="Zoom in"
              disabled={viewport.zoom >= MAX_WORKSPACE_ZOOM}
              onClick={() => setZoom(viewportRef.current.zoom + 0.1)}
              type="button"
            >
              <span aria-hidden="true">+</span>
            </button>
            <button
              disabled={isViewportDefault}
              onClick={resetViewport}
              type="button"
            >
              Reset view
            </button>
          </div>
          <button
            aria-label="Minimize Canvas"
            className="workspace-canvas__minimize"
            onClick={minimizeCanvas}
            type="button"
          >
            Minimize
          </button>
        </div>
      ) : (
        <div className="workspace-canvas-card__header">
          <div>
            <span className="eyebrow">Notes Canvas</span>
            <h2 id="notes-canvas-title">
              Map ideas while your focus session runs.
            </h2>
            <p>
              Capture thoughts, arrange priorities, and keep lightweight
              planning beside your DeepFlow timers.
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
      )}

      <div className="workspace-canvas-shell">
        <div
          aria-label="Infinite notes canvas. Hold Space and drag, or use the middle mouse button, to pan."
          className="workspace-canvas"
          data-panning={isPanning}
          data-empty={notes.length === 0}
          onPointerCancel={(event) => {
            if (!endCanvasTouchGesture(event)) {
              endPan(event);
              endSelectionBox(event);
            }
          }}
          onDoubleClick={handleCanvasDoubleClick}
          onPointerDownCapture={(event) => {
            if (!startCanvasTouchGesture(event)) startPan(event);
          }}
          onPointerDown={startSelectionBox}
          onPointerMove={(event) => {
            if (!moveCanvasTouchGesture(event)) {
              panCanvas(event);
              moveSelectionBox(event);
            }
          }}
          onPointerUp={(event) => {
            if (!endCanvasTouchGesture(event)) {
              endPan(event);
              endSelectionBox(event);
            }
          }}
          ref={canvasRef}
        >
          <div className="workspace-canvas__world" ref={worldRef}>
            {visibleConnections.length > 0 ? (
              <svg
                aria-label="Note connections"
                className="workspace-connections"
              >
                {visibleConnections.map((connection) => (
                  <g
                    data-selected={selectedConnectionId === connection.id}
                    key={connection.id}
                  >
                    <path
                      aria-hidden="true"
                      className="workspace-connection__line"
                      d={connection.path}
                    />
                    <path
                      aria-label="Select note connection"
                      className="workspace-connection__hit-area"
                      d={connection.path}
                      onClick={() => setSelectedConnectionId(connection.id)}
                      onKeyDown={(event) =>
                        handleConnectionKeyDown(event, connection.id)
                      }
                      role="button"
                      tabIndex={0}
                    />
                  </g>
                ))}
              </svg>
            ) : null}

            {connectionPreviewPath ? (
              <svg
                aria-hidden="true"
                className="workspace-connection-preview"
              >
                <path d={connectionPreviewPath} />
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

            {selectionBounds ? (
              <div
                aria-hidden="true"
                className="workspace-selection-box"
                style={{
                  height: `${selectionBounds.bottom - selectionBounds.top}px`,
                  transform: `translate3d(${selectionBounds.left}px, ${selectionBounds.top}px, 0)`,
                  width: `${selectionBounds.right - selectionBounds.left}px`,
                }}
              />
            ) : null}

            {notes.map((note) => (
              <article
                className="workspace-note"
                data-color={note.color}
                data-entering={enteringNoteIds.includes(note.id)}
                data-selected={selectedNoteIds.includes(note.id)}
                key={note.id}
                onPointerDown={(event) => handleNotePointerDown(event, note.id)}
                style={{
                  height: `${note.height}px`,
                  left: `${note.x}px`,
                  top: `${note.y}px`,
                  width: `${note.width}px`,
                }}
              >
                <div
                  className="workspace-note__surface"
                  onAnimationEnd={() =>
                    setEnteringNoteIds((currentIds) =>
                      currentIds.filter((id) => id !== note.id)
                    )
                  }
                >
                  <div
                    aria-label="Note connection handles"
                    className="workspace-note__connection-nodes"
                  >
                    {WORKSPACE_CONNECTION_SIDES.map((side) => (
                      <button
                        aria-label={`Connect from ${side} side`}
                        aria-pressed={
                          connectionDragSession?.source.noteId === note.id &&
                          connectionDragSession.source.side === side
                        }
                        className="workspace-note__connection-node"
                        data-connection-note-id={note.id}
                        data-connection-side={side}
                        data-connection-target={
                          connectionDragSession?.target?.noteId === note.id &&
                          connectionDragSession.target.side === side
                        }
                        data-side={side}
                        key={side}
                        onPointerCancel={cancelConnectionDrag}
                        onPointerDown={(event) =>
                          startConnectionDrag(event, note.id, side)
                        }
                        onPointerMove={moveConnectionDrag}
                        onPointerUp={endConnectionDrag}
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
                      <span
                        aria-hidden="true"
                        className="workspace-note__grip-icon"
                      />
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
                    onChange={(event) =>
                      updateNoteTitle(note.id, event.target.value)
                    }
                    placeholder="Name this idea"
                    ref={(element) => {
                      if (element) noteTitleRefs.current.set(note.id, element);
                      else noteTitleRefs.current.delete(note.id);
                    }}
                    type="text"
                    value={note.title}
                  />
                  <div className="workspace-note__body-wrap">
                    <textarea
                      aria-label={`${note.title} body`}
                      className="workspace-note__body"
                      maxLength={1_000}
                      onChange={(event) =>
                        updateNoteText(note.id, event.target.value)
                      }
                      placeholder="Write your thought..."
                      value={note.text}
                    />
                  </div>
                </div>
                <button
                  aria-label="Resize note"
                  className="workspace-note__resize-handle"
                  onPointerCancel={endResize}
                  onPointerDown={(event) => startResize(event, note)}
                  onPointerMove={resizeNote}
                  onPointerUp={endResize}
                  type="button"
                />
              </article>
            ))}
          </div>

          <div
            aria-hidden={!hasMultiSelection}
            className="workspace-multiselect-bar"
            data-visible={hasMultiSelection}
          >
            <span>{selectedNoteIds.length} notes selected</span>
            <div className="workspace-multiselect-bar__actions">
              <button
                aria-expanded={isMultiColorPaletteOpen}
                aria-label="Change selected note colors"
                onClick={() =>
                  setIsMultiColorPaletteOpen((isOpen) => !isOpen)
                }
                type="button"
              >
                Color
              </button>
              <button
                aria-label="Duplicate selected notes"
                disabled={!canDuplicateSelection}
                onClick={duplicateSelectedNotes}
                title={
                  canDuplicateSelection
                    ? undefined
                    : `Duplicating this selection would exceed the ${MAX_FREE_WORKSPACE_NOTES}-note free limit.`
                }
                type="button"
              >
                Duplicate
              </button>
              <button
                aria-label="Delete selected notes"
                className="workspace-multiselect-bar__delete"
                onClick={() => removeNotes(selectedNoteIdsRef.current)}
                type="button"
              >
                Delete
              </button>
            </div>

            {isMultiColorPaletteOpen && hasMultiSelection ? (
              <div
                aria-label="Selected note color options"
                className="workspace-multiselect-bar__palette"
              >
                {WORKSPACE_NOTE_COLORS.map((color) => (
                  <button
                    aria-label={`Use ${color.label} for selected notes`}
                    className="workspace-note__color"
                    data-color={color.id}
                    key={color.id}
                    onClick={() => updateSelectedNoteColor(color.id)}
                    type="button"
                  />
                ))}
              </div>
            ) : null}
          </div>

          {!isCanvasExpanded ? (
            <div
              aria-label="Canvas zoom controls"
              className="workspace-canvas__zoom-controls"
            >
              <button
                aria-label="Zoom out"
                disabled={viewport.zoom <= MIN_WORKSPACE_ZOOM}
                onClick={() => setZoom(viewportRef.current.zoom - 0.1)}
                type="button"
              >
                <span aria-hidden="true">-</span>
              </button>
              <output aria-live="polite">
                {Math.round(viewport.zoom * 100)}%
              </output>
              <button
                aria-label="Zoom in"
                disabled={viewport.zoom >= MAX_WORKSPACE_ZOOM}
                onClick={() => setZoom(viewportRef.current.zoom + 0.1)}
                type="button"
              >
                <span aria-hidden="true">+</span>
              </button>
              <button
                className="workspace-canvas__reset-view"
                disabled={isViewportDefault}
                onClick={resetViewport}
                type="button"
              >
                Reset view
              </button>
              <button
                aria-label="Expand canvas"
                className="workspace-canvas__expand"
                onClick={expandCanvas}
                type="button"
              >
                Expand canvas
              </button>
            </div>
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
        </div>
      </div>

      {!isCanvasExpanded ? (
        <div className="workspace-plan-row">
          <div>
            <strong>
              {notes.length} / {MAX_FREE_WORKSPACE_NOTES} notes used
            </strong>
            <p>
              Free workspace includes one board, up to{" "}
              {MAX_FREE_WORKSPACE_NOTES} local notes, and{" "}
              {MAX_FREE_WORKSPACE_CONNECTIONS} connections.
            </p>
          </div>
          {!canCreateNote || !canCreateConnection ? (
            <aside className="workspace-upgrade-card" aria-live="polite">
              <span className="workspace-upgrade-card__badge">Free limit</span>
              <h3>Workspace limit reached</h3>
              <p>
                Free users can create up to {MAX_FREE_WORKSPACE_NOTES} notes and{" "}
                {MAX_FREE_WORKSPACE_CONNECTIONS} connections. Expanded canvas
                capacity and future Workspace features are planned, but supporter
                access is not active yet.
              </p>
              <div className="workspace-upgrade-card__features">
                {foundingMemberFeatures.map((feature) => (
                  <span key={feature}>
                    <CheckIcon />
                    {feature}
                  </span>
                ))}
              </div>
              <Link
                className="button button--light button--full"
                href="/pricing?source=workspace_upgrade#founding-member"
              >
                Join updates
              </Link>
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  return isCanvasExpanded
    ? createPortal(canvasCard, document.body)
    : canvasCard;
}
