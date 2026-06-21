"use client";

import Link from "next/link";
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
  writeWorkspaceViewport,
  zoomWorkspaceViewport,
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
  noteIds: string[];
  notes: WorkspaceNote[];
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
};

type SelectionBoxState = WorkspaceSelectionRect & {
  pointerId: number;
};

type ConnectionSource = {
  noteId: string;
  side: WorkspaceConnectionSide;
};

type ConnectionDragState = {
  pointerId: number;
  source: ConnectionSource;
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
    x: note.x + WORKSPACE_NOTE_WIDTH / 2,
    y: note.y + WORKSPACE_NOTE_HEIGHT / 2,
  };
  const otherCenter = {
    x: otherNote.x + WORKSPACE_NOTE_WIDTH / 2,
    y: otherNote.y + WORKSPACE_NOTE_HEIGHT / 2,
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
    return { x: note.x + WORKSPACE_NOTE_WIDTH / 2, y: note.y };
  }

  if (side === "right") {
    return {
      x: note.x + WORKSPACE_NOTE_WIDTH,
      y: note.y + WORKSPACE_NOTE_HEIGHT / 2,
    };
  }

  if (side === "bottom") {
    return {
      x: note.x + WORKSPACE_NOTE_WIDTH / 2,
      y: note.y + WORKSPACE_NOTE_HEIGHT,
    };
  }

  return { x: note.x, y: note.y + WORKSPACE_NOTE_HEIGHT / 2 };
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
    x: fromNote.x + WORKSPACE_NOTE_WIDTH / 2,
    y: fromNote.y + WORKSPACE_NOTE_HEIGHT / 2,
  };
  const toCenter = {
    x: toNote.x + WORKSPACE_NOTE_WIDTH / 2,
    y: toNote.y + WORKSPACE_NOTE_HEIGHT / 2,
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

function getConnectionPreviewPath(
  note: WorkspaceNote,
  side: WorkspaceConnectionSide,
  end: WorkspacePoint,
) {
  const start = getConnectionAnchor(note, side);
  const distanceX = Math.abs(end.x - start.x);
  const distanceY = Math.abs(end.y - start.y);
  const lift = Math.min(90, Math.max(28, distanceX * 0.12 + distanceY * 0.08));
  const controlX = start.x + (end.x - start.x) * 0.5;
  const controlY = start.y + (end.y - start.y) * 0.5 - lift;

  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
}

export function NotesCanvas() {
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [connections, setConnections] = useState<WorkspaceConnection[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<WorkspaceViewport>(
    DEFAULT_WORKSPACE_VIEWPORT,
  );
  const [connectionSource, setConnectionSource] =
    useState<ConnectionSource | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);
  const [hydrated, setHydrated] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isMultiColorPaletteOpen, setIsMultiColorPaletteOpen] =
    useState(false);
  const [enteringNoteIds, setEnteringNoteIds] = useState<string[]>([]);
  const [connectionPreviewEnd, setConnectionPreviewEnd] =
    useState<WorkspacePoint | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState | null>(
    null,
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const connectionDragRef = useRef<ConnectionDragState | null>(null);
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
    if (!connectionSource || !connectionPreviewEnd) return null;

    const sourceNote = notes.find(
      (note) => note.id === connectionSource.noteId,
    );
    if (!sourceNote) return null;

    return getConnectionPreviewPath(
      sourceNote,
      connectionSource.side,
      connectionPreviewEnd,
    );
  }, [connectionPreviewEnd, connectionSource, notes]);

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
          position: { x: note.x + 28, y: note.y + 28 },
          text: note.text,
          title: note.title,
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
    setConnectionSource((currentSource) =>
      currentSource && noteIds.includes(currentSource.noteId)
        ? null
        : currentSource,
    );
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

  const completeConnection = (
    source: ConnectionSource,
    noteId: string,
    side: WorkspaceConnectionSide,
  ) => {
    if (source.noteId === noteId) return;

    setConnections((currentConnections) =>
      addWorkspaceConnection(
        currentConnections,
        source.noteId,
        noteId,
        source.side,
        side,
      ),
    );
    setConnectionSource(null);
    setConnectionPreviewEnd(null);
  };

  const startConnectionDrag = (
    event: PointerEvent<HTMLButtonElement>,
    noteId: string,
    side: WorkspaceConnectionSide,
  ) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    const currentSource = connectionSource;

    if (currentSource && currentSource.noteId !== noteId) {
      completeConnection(currentSource, noteId, side);
      return;
    }

    if (!currentSource && !canCreateWorkspaceConnection(connections)) return;

    const source = { noteId, side };
    const previewPoint = getWorldPointFromClient(event.clientX, event.clientY);
    setConnectionSource(source);
    setConnectionPreviewEnd(previewPoint);
    event.currentTarget.setPointerCapture(event.pointerId);
    connectionDragRef.current = { pointerId: event.pointerId, source };
  };

  const moveConnectionDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const connectionDrag = connectionDragRef.current;
    if (!connectionDrag || connectionDrag.pointerId !== event.pointerId) return;

    setConnectionPreviewEnd(
      getWorldPointFromClient(event.clientX, event.clientY),
    );
  };

  const endConnectionDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const connectionDrag = connectionDragRef.current;
    if (!connectionDrag || connectionDrag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    connectionDragRef.current = null;
    setConnectionPreviewEnd(null);

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>("[data-connection-note-id][data-connection-side]");
    const noteId = target?.dataset.connectionNoteId;
    const side = target?.dataset.connectionSide;

    if (
      noteId &&
      side &&
      WORKSPACE_CONNECTION_SIDES.includes(side as WorkspaceConnectionSide)
    ) {
      completeConnection(
        connectionDrag.source,
        noteId,
        side as WorkspaceConnectionSide,
      );
    }
  };

  const cancelConnectionDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    connectionDragRef.current = null;
    setConnectionPreviewEnd(null);
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

  useEffect(() => {
    const handleSelectionKeyDown = (event: globalThis.KeyboardEvent) => {
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
  }, [removeNotes, selectedConnectionId, setNoteSelection]);

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

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
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
    if (event.button !== 0) return;

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
    const startedOnControl =
      target instanceof Element &&
      target.closest("button, input, textarea, select, a");

    if (
      (!shouldPanWithSpace && !shouldPanWithMiddleButton) ||
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
          aria-label="Infinite notes canvas. Hold Space and drag, or use the middle mouse button, to pan."
          className="workspace-canvas"
          data-panning={isPanning}
          data-empty={notes.length === 0}
          onPointerCancel={(event) => {
            endPan(event);
            endSelectionBox(event);
          }}
          onDoubleClick={handleCanvasDoubleClick}
          onPointerDownCapture={startPan}
          onPointerDown={startSelectionBox}
          onPointerMove={(event) => {
            panCanvas(event);
            moveSelectionBox(event);
          }}
          onPointerUp={(event) => {
            endPan(event);
            endSelectionBox(event);
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
                  transform: `translate3d(${note.x}px, ${note.y}px, 0)`,
                }}
              >
              <div className="workspace-note__surface">
              <div className="workspace-note__connection-nodes" aria-label="Note connection handles">
                {WORKSPACE_CONNECTION_SIDES.map((side) => (
                  <button
                    aria-label={`Connect from ${side} side`}
                    aria-pressed={
                      connectionSource?.noteId === note.id &&
                      connectionSource.side === side
                    }
                    className="workspace-note__connection-node"
                    data-connection-note-id={note.id}
                    data-connection-side={side}
                    data-side={side}
                    key={side}
                    onClick={(event) => {
                      if (event.detail === 0) connectNote(note.id, side);
                    }}
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
                ref={(element) => {
                  if (element) noteTitleRefs.current.set(note.id, element);
                  else noteTitleRefs.current.delete(note.id);
                }}
                value={note.title}
              />
              <textarea
                aria-label={`${note.title} body`}
                maxLength={1_000}
                onChange={(event) => updateNoteText(note.id, event.target.value)}
                placeholder="Write your thought..."
                value={note.text}
              />
              </div>
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
                    : "Duplicating this selection would exceed the 10-note free limit."
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

          <div className="workspace-canvas__zoom-controls" aria-label="Canvas zoom controls">
            <button
              aria-label="Zoom out"
              disabled={viewport.zoom <= MIN_WORKSPACE_ZOOM}
              onClick={() => setZoom(viewportRef.current.zoom - 0.1)}
              type="button"
            >
              <span aria-hidden="true">-</span>
            </button>
            <output aria-live="polite">{Math.round(viewport.zoom * 100)}%</output>
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
              disabled={
                viewport.x === DEFAULT_WORKSPACE_VIEWPORT.x &&
                viewport.y === DEFAULT_WORKSPACE_VIEWPORT.y &&
                viewport.zoom === DEFAULT_WORKSPACE_VIEWPORT.zoom
              }
              onClick={resetViewport}
              type="button"
            >
              Reset view
            </button>
          </div>

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
            <Link
              className="button button--light button--full"
              href="/pricing?source=workspace_upgrade#founding-member"
            >
              Become a Founding Member
            </Link>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
