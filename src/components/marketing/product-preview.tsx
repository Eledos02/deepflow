"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ArrowIcon,
  ChartIcon,
  LayersIcon,
  ShieldIcon,
  SparkIcon,
  TargetIcon,
  TimerIcon,
} from "@/components/ui/icons";

type PreviewView = "overview" | "focus" | "goals" | "insights";

const navigation: Array<{
  id: PreviewView;
  label: string;
  icon: typeof LayersIcon;
}> = [
  { id: "overview", label: "Overview", icon: LayersIcon },
  { id: "focus", label: "Focus", icon: TimerIcon },
  { id: "goals", label: "Goals", icon: TargetIcon },
  { id: "insights", label: "Insights", icon: ChartIcon },
];

const week = [
  { day: "M", value: 54 },
  { day: "T", value: 78 },
  { day: "W", value: 46 },
  { day: "T", value: 92 },
  { day: "F", value: 68 },
  { day: "S", value: 34 },
  { day: "S", value: 18 },
];

function OverviewView() {
  return (
    <>
      <div className="dashboard-preview__heading">
        <div>
          <span>Focus overview</span>
          <strong>Make attention visible.</strong>
        </div>
        <span className="dashboard-preview__streak">6 day rhythm</span>
      </div>

      <div className="dashboard-preview__stats">
        <article>
          <span>Focused time</span>
          <strong>12h 40m</strong>
          <small>+18% from last week</small>
        </article>
        <article>
          <span>Weekly goal</span>
          <strong>76%</strong>
          <small>3h 50m remaining</small>
        </article>
        <article>
          <span>Deep sessions</span>
          <strong>14</strong>
          <small>54 min average</small>
        </article>
      </div>

      <div className="dashboard-preview__lower">
        <article className="focus-chart">
          <div className="preview-card-heading">
            <div>
              <span>Focus pattern</span>
              <strong>8.4 hours this week</strong>
            </div>
            <small>Last 7 days</small>
          </div>
          <div className="focus-chart__bars">
            {week.map((item, index) => (
              <span className="focus-chart__column" key={`${item.day}-${index}`}>
                <span style={{ height: `${item.value}%` }} />
                <small>{item.day}</small>
              </span>
            ))}
          </div>
        </article>

        <article className="today-plan">
          <div className="preview-card-heading">
            <div>
              <span>Today</span>
              <strong>Three meaningful blocks</strong>
            </div>
          </div>
          <div className="today-plan__item" data-complete="true">
            <span />
            <div>
              <strong>Strategy draft</strong>
              <small>50 min</small>
            </div>
          </div>
          <div className="today-plan__item">
            <span />
            <div>
              <strong>Product review</strong>
              <small>25 min</small>
            </div>
          </div>
          <div className="today-plan__item">
            <span />
            <div>
              <strong>Research synthesis</strong>
              <small>50 min</small>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}

function FocusView() {
  return (
    <div className="preview-view preview-view--focus">
      <div className="dashboard-preview__heading">
        <div>
          <span>Focus room</span>
          <strong>One clear commitment.</strong>
        </div>
        <span className="dashboard-preview__streak">Ready</span>
      </div>
      <div className="preview-focus-layout">
        <article className="preview-focus-card">
          <span className="preview-focus-card__eyebrow">Next session</span>
          <div className="preview-focus-card__ring">
            <TimerIcon />
            <strong>50:00</strong>
            <span>Deep work</span>
          </div>
          <Link className="button button--dark button--full" href="/tools/focus-timer">
            Start focus
            <ArrowIcon />
          </Link>
        </article>
        <article className="preview-empty-state">
          <span className="preview-empty-state__icon">
            <SparkIcon />
          </span>
          <span className="eyebrow">Session intention</span>
          <h3>What deserves your full attention?</h3>
          <p>
            Name one outcome before the clock begins. Your recent intentions
            will appear here as a quiet starting point.
          </p>
          <div className="preview-empty-state__line">
            Write a clear outcome...
          </div>
        </article>
      </div>
    </div>
  );
}

function GoalsView() {
  return (
    <div className="preview-view">
      <div className="dashboard-preview__heading">
        <div>
          <span>Weekly goals</span>
          <strong>Consistency over intensity.</strong>
        </div>
        <span className="dashboard-preview__streak">76% complete</span>
      </div>
      <div className="preview-goals">
        <article className="preview-goal-card preview-goal-card--primary">
          <div>
            <span>Deep work target</span>
            <strong>12h 40m</strong>
            <small>of 16 hours</small>
          </div>
          <div
            aria-label="76 percent of weekly goal complete"
            className="preview-goal-ring"
            role="img"
          >
            <span>76%</span>
          </div>
        </article>
        <article className="preview-goal-card">
          <TargetIcon />
          <div>
            <span>Session rhythm</span>
            <strong>4 of 5 days</strong>
            <small>One more day builds the week.</small>
          </div>
        </article>
        <article className="preview-goal-card">
          <ShieldIcon />
          <div>
            <span>Protected mornings</span>
            <strong>3 sessions</strong>
            <small>Your strongest window is before 11am.</small>
          </div>
        </article>
      </div>
    </div>
  );
}

function InsightsView() {
  return (
    <div className="preview-view">
      <div className="dashboard-preview__heading">
        <div>
          <span>Attention insights</span>
          <strong>Notice what helps you go deeper.</strong>
        </div>
        <span className="dashboard-preview__streak">Last 30 days</span>
      </div>
      <div className="preview-insights">
        <article className="preview-insight-callout">
          <span className="preview-insight-callout__icon">
            <SparkIcon />
          </span>
          <span>Your strongest pattern</span>
          <strong>Tuesday mornings create 34% longer sessions.</strong>
          <p>Protect 9:00 to 11:00 for writing and complex decisions.</p>
        </article>
        <article className="preview-insight-list">
          <div>
            <span>Average session</span>
            <strong>54 min</strong>
          </div>
          <div>
            <span>Best focus window</span>
            <strong>9-11am</strong>
          </div>
          <div>
            <span>Most consistent task</span>
            <strong>Writing</strong>
          </div>
        </article>
      </div>
    </div>
  );
}

export function ProductPreview() {
  const [activeView, setActiveView] = useState<PreviewView>("overview");

  return (
    <section
      aria-label="Interactive preview of the DeepFlow productivity dashboard"
      className="dashboard-preview"
    >
      <div className="dashboard-preview__topbar">
        <span className="dashboard-preview__workspace">
          <span className="dashboard-preview__logo">
            <TimerIcon />
          </span>
          My workspace
        </span>
        <span className="dashboard-preview__period">This week</span>
        <span className="dashboard-preview__avatar">AR</span>
      </div>

      <div className="dashboard-preview__mobile-tabs" aria-label="Product preview views">
        {navigation.map((item) => (
          <button
            aria-pressed={activeView === item.id}
            key={item.id}
            onClick={() => setActiveView(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="dashboard-preview__body">
        <aside className="dashboard-preview__sidebar">
          <nav aria-label="Product preview navigation">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  aria-pressed={activeView === item.id}
                  className="dashboard-preview__nav-item"
                  data-active={activeView === item.id}
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  type="button"
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <span className="dashboard-preview__privacy">
            <ShieldIcon />
            Private by default
          </span>
        </aside>

        <div className="dashboard-preview__main" key={activeView}>
          {activeView === "overview" ? <OverviewView /> : null}
          {activeView === "focus" ? <FocusView /> : null}
          {activeView === "goals" ? <GoalsView /> : null}
          {activeView === "insights" ? <InsightsView /> : null}
        </div>
      </div>
    </section>
  );
}
