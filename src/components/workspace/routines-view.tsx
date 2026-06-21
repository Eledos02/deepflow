"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { getTimerPath, isConfiguredTimer } from "@/config/timers";
import { writeRoutineSessionHandoff } from "@/features/timer/routine-session-handoff";
import {
  MAX_FREE_WORKSPACE_ROUTINES,
  WORKSPACE_ROUTINE_COLORS,
  WORKSPACE_ROUTINE_TEMPLATES,
  canCreateWorkspaceRoutine,
  createWorkspaceRoutine,
  deleteWorkspaceRoutine,
  normalizeWorkspaceRoutineDraft,
  readWorkspaceRoutines,
  updateWorkspaceRoutine,
  writeWorkspaceRoutines,
  type WorkspaceRoutine,
  type WorkspaceRoutineDraft,
} from "@/features/workspace/workspace-routines";

const presetDurations = [15, 25, 30, 45, 50, 60, 90];

const emptyDraft = (): WorkspaceRoutineDraft => ({
  name: "",
  durationMinutes: 25,
  intention: "",
  color: "warm-cream",
});

type RoutineEditor = {
  routineId: string | null;
  draft: WorkspaceRoutineDraft;
};

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function RoutinesView() {
  const router = useRouter();
  const [routines, setRoutines] = useState<WorkspaceRoutine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editor, setEditor] = useState<RoutineEditor | null>(null);
  const [error, setError] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const canCreate = useMemo(
    () => canCreateWorkspaceRoutine(routines),
    [routines],
  );
  const hasNoSavedRoutines = hydrated && routines.length === 0;

  useEffect(() => {
    const refreshId = window.setTimeout(() => {
      setRoutines(readWorkspaceRoutines());
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(refreshId);
  }, []);

  const saveRoutines = (nextRoutines: WorkspaceRoutine[]) => {
    setRoutines(nextRoutines);
    writeWorkspaceRoutines(nextRoutines);
  };

  const openEditor = (draft = emptyDraft(), routineId: string | null = null) => {
    setError("");
    setConfirmingDeleteId(null);
    setEditor({ routineId, draft });
  };

  const saveRoutine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;

    const normalizedDraft = normalizeWorkspaceRoutineDraft(editor.draft);
    if (!normalizedDraft) {
      setError("Give this routine a name and a positive duration.");
      return;
    }

    if (editor.routineId) {
      saveRoutines(
        updateWorkspaceRoutine(routines, editor.routineId, normalizedDraft),
      );
      setEditor(null);
      return;
    }

    if (!canCreate) {
      setError("Your free workspace already has three routines.");
      return;
    }

    const routine = createWorkspaceRoutine({ draft: normalizedDraft });
    if (!routine) return;
    saveRoutines([routine, ...routines]);
    setEditor(null);
  };

  const startRoutine = (routine: WorkspaceRoutine) => {
    writeRoutineSessionHandoff({
      routineId: routine.id,
      routineName: routine.name,
      durationMinutes: routine.durationMinutes,
      intention: routine.intention,
      startedFrom: "/workspace",
    });

    router.push(
      isConfiguredTimer(routine.durationMinutes)
        ? getTimerPath(routine.durationMinutes)
        : "/tools/focus-timer",
    );
  };

  const deleteRoutine = (routineId: string) => {
    if (confirmingDeleteId !== routineId) {
      setConfirmingDeleteId(routineId);
      return;
    }

    saveRoutines(deleteWorkspaceRoutine(routines, routineId));
    setConfirmingDeleteId(null);
  };

  return (
    <section className="workspace-routines" aria-labelledby="workspace-routines-title">
      <div className="workspace-dashboard-card workspace-routines__intro">
        <div className="workspace-dashboard-card__header workspace-dashboard-card__header--split">
          <div>
            <span className="eyebrow">Routines</span>
            <h2 id="workspace-routines-title">Build repeatable focus rituals.</h2>
            <p>
              Save the sessions you return to often, then start them again with
              one click.
            </p>
          </div>
          <button
            className="workspace-routines__new"
            disabled={!canCreate}
            onClick={() => openEditor()}
            type="button"
          >
            New routine
          </button>
        </div>

        {editor ? (
          <form className="workspace-routine-form" onSubmit={saveRoutine}>
            <div className="workspace-routine-form__header">
              <strong>{editor.routineId ? "Refine routine" : "Create a routine"}</strong>
              <button onClick={() => setEditor(null)} type="button">
                Cancel
              </button>
            </div>
            <label>
              Routine name
              <input
                autoFocus
                maxLength={80}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? { ...current, draft: { ...current.draft, name: event.target.value } }
                      : current,
                  )
                }
                placeholder="e.g. Morning deep work"
                value={editor.draft.name}
              />
            </label>
            <label>
              Duration in minutes
              <input
                min={1}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? {
                          ...current,
                          draft: {
                            ...current.draft,
                            durationMinutes: Number(event.target.value),
                          },
                        }
                      : current,
                  )
                }
                type="number"
                value={editor.draft.durationMinutes}
              />
            </label>
            <div className="workspace-routine-form__presets" aria-label="Suggested durations">
              {presetDurations.map((minutes) => (
                <button
                  aria-pressed={editor.draft.durationMinutes === minutes}
                  key={minutes}
                  onClick={() =>
                    setEditor((current) =>
                      current
                        ? {
                            ...current,
                            draft: { ...current.draft, durationMinutes: minutes },
                          }
                        : current,
                    )
                  }
                  type="button"
                >
                  {minutes}m
                </button>
              ))}
            </div>
            <label className="workspace-routine-form__intention">
              Intention <small>Optional</small>
              <textarea
                maxLength={120}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? {
                          ...current,
                          draft: { ...current.draft, intention: event.target.value },
                        }
                      : current,
                  )
                }
                placeholder="What will this session protect?"
                value={editor.draft.intention}
              />
            </label>
            <div className="workspace-routine-form__colors" aria-label="Routine color">
              {WORKSPACE_ROUTINE_COLORS.map((color) => (
                <button
                  aria-label={`Use ${color.label}`}
                  aria-pressed={editor.draft.color === color.id}
                  className="workspace-routine-color"
                  data-color={color.id}
                  key={color.id}
                  onClick={() =>
                    setEditor((current) =>
                      current
                        ? { ...current, draft: { ...current.draft, color: color.id } }
                        : current,
                    )
                  }
                  type="button"
                />
              ))}
            </div>
            {error ? <p className="workspace-routine-form__error">{error}</p> : null}
            <button className="workspace-routine-form__submit" type="submit">
              {editor.routineId ? "Save changes" : "Save routine"}
            </button>
          </form>
        ) : null}
      </div>

      <section
        className={
          hasNoSavedRoutines
            ? "workspace-routines__section workspace-routines__section--empty"
            : "workspace-routines__section"
        }
        aria-labelledby="saved-routines-title"
      >
        {!hasNoSavedRoutines ? (
          <div className="workspace-routines__section-heading">
            <div>
              <span className="eyebrow">Your routines</span>
              <h3 id="saved-routines-title">Return to what works.</h3>
            </div>
            <span className="workspace-routines__saved-count">
              {routines.length} / {MAX_FREE_WORKSPACE_ROUTINES} saved
            </span>
          </div>
        ) : null}

        {!hydrated ? null : routines.length === 0 ? (
          <div className="workspace-routines__empty" id="saved-routines-title">
            <strong>Save the sessions you trust.</strong>
            <p>Start with a template or make a ritual from scratch.</p>
          </div>
        ) : (
          <div className="workspace-routine-grid">
            {routines.map((routine) => (
              <article className="workspace-routine-card" data-color={routine.color} key={routine.id}>
                <div className="workspace-routine-card__topline">
                  <span className="workspace-routine-card__color" aria-hidden="true" />
                  <small>Saved {formatCreatedDate(routine.createdAt)}</small>
                </div>
                <h4>{routine.name}</h4>
                <strong>{routine.durationMinutes} minutes</strong>
                <p>{routine.intention || "A clear block, ready when you are."}</p>
                <div className="workspace-routine-card__actions">
                  <button onClick={() => startRoutine(routine)} type="button">Start session</button>
                  <button onClick={() => openEditor(routine, routine.id)} type="button">Edit</button>
                  <button
                    data-confirming={confirmingDeleteId === routine.id}
                    onClick={() => deleteRoutine(routine.id)}
                    type="button"
                  >
                    {confirmingDeleteId === routine.id ? "Confirm delete" : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        className="workspace-routines__section workspace-routines__section--templates"
        data-primary={hasNoSavedRoutines || undefined}
        aria-labelledby="routine-templates-title"
      >
        <div className="workspace-routines__section-heading">
          <div>
            <span className="eyebrow">Starter templates</span>
            <h3 id="routine-templates-title">Begin with a familiar rhythm.</h3>
          </div>
          <span className="workspace-routines__saved-count">
            {routines.length} / {MAX_FREE_WORKSPACE_ROUTINES} saved
          </span>
        </div>
        <div className="workspace-routine-template-grid">
          {WORKSPACE_ROUTINE_TEMPLATES.map((template) => (
            <article className="workspace-routine-template" key={template.id}>
              <span>{template.durationMinutes}m</span>
              <h4>{template.name}</h4>
              <p>{template.intention}</p>
              <button
                disabled={!canCreate}
                onClick={() => openEditor(template)}
                type="button"
              >
                Use template
              </button>
            </article>
          ))}
        </div>
      </section>

      {!canCreate ? (
        <aside className="workspace-upgrade-card workspace-routines__upgrade">
          <span className="workspace-upgrade-card__badge">Routine limit</span>
          <h3>Keep every ritual close.</h3>
          <p>
            Free users can create up to 3 routines. Founding Members get
            unlimited routines, cloud sync, routine history, advanced insights,
            and future workspace automation.
          </p>
        </aside>
      ) : null}
    </section>
  );
}
