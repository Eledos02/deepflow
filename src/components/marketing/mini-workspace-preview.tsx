import Link from "next/link";

import {
  ArrowIcon,
  ChartIcon,
  LayersIcon,
  SparkIcon,
  TargetIcon,
  TimerIcon,
} from "@/components/ui/icons";

const navigation = [
  { label: "Overview", icon: LayersIcon, active: true },
  { label: "Focus", icon: TimerIcon, active: false },
  { label: "Goals", icon: TargetIcon, active: false },
  { label: "Notes Canvas", icon: SparkIcon, active: false },
  { label: "Insights", icon: ChartIcon, active: false },
  { label: "Routines", icon: TimerIcon, active: false },
] as const;

export function MiniWorkspacePreview() {
  return (
    <Link
      aria-label="Open the DeepFlow Workspace"
      className="mini-workspace"
      href="/workspace"
    >
      <div className="mini-workspace__topbar">
        <span className="mini-workspace__mark">
          <TimerIcon />
        </span>
        <strong>My Workspace</strong>
        <span>This week</span>
      </div>
      <div className="mini-workspace__body">
        <aside className="mini-workspace__sidebar" aria-hidden="true">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <span data-active={item.active || undefined} key={item.label}>
                <Icon />
                {item.label}
              </span>
            );
          })}
        </aside>
        <div className="mini-workspace__main">
          <div className="mini-workspace__heading">
            <div>
              <span>Focus overview</span>
              <strong>Your attention, held with care.</strong>
            </div>
            <small>5 day rhythm</small>
          </div>
          <div className="mini-workspace__metrics">
            <article>
              <span>Focused time</span>
              <strong>8h 40m</strong>
              <small>this week</small>
            </article>
            <article>
              <span>Sessions</span>
              <strong>12</strong>
              <small>steady momentum</small>
            </article>
            <article>
              <span>Best window</span>
              <strong>9-11am</strong>
              <small>clear attention</small>
            </article>
          </div>
          <div className="mini-workspace__lower">
            <article className="mini-workspace__journal">
              <div className="mini-workspace__card-heading">
                <span>Focus Journal</span>
                <small>Today</small>
              </div>
              <div>
                <span className="mini-workspace__check">&#10003;</span>
                <p>
                  <strong>Strategy draft</strong>
                  <small>50m - Focus Timer</small>
                </p>
              </div>
              <div>
                <span className="mini-workspace__check">&#10003;</span>
                <p>
                  <strong>Reading notes</strong>
                  <small>25m - Study Timer</small>
                </p>
              </div>
            </article>
            <article className="mini-workspace__routine">
              <div className="mini-workspace__card-heading">
                <span>Routine</span>
                <SparkIcon />
              </div>
              <strong>Morning deep work</strong>
              <p>50 min - Rain Window</p>
              <span>Ready when you are</span>
            </article>
            <article className="mini-workspace__canvas">
              <div className="mini-workspace__card-heading">
                <span>Notes Canvas</span>
                <LayersIcon />
              </div>
              <span className="mini-workspace__note mini-workspace__note--one">
                Shape the brief
              </span>
              <span className="mini-workspace__note mini-workspace__note--two">
                Gather examples
              </span>
              <i className="mini-workspace__connection" />
            </article>
          </div>
          <span className="mini-workspace__cta">
            Open Workspace
            <ArrowIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}
