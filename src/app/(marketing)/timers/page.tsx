import Link from "next/link";

import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import { ArrowIcon, SparkIcon, TargetIcon, TimerIcon } from "@/components/ui/icons";
import { getTimerPath, timers, type TimerMinutes } from "@/config/timers";
import { getTimerToolPath } from "@/content/timer-tools";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Free Online Focus Timers - DeepFlow",
  description:
    "Choose a calm online timer for focus sessions, study blocks, Pomodoro work, ADHD-friendly focus, breathing breaks, and short tasks.",
  path: "/timers",
  keywords: [
    "online timer",
    "focus timer",
    "study timer",
    "pomodoro timer",
    "ADHD timer",
  ],
});

type TimerHubLink = {
  label: string;
  href: string;
  description: string;
};

const quickTimerMinutes = [5, 10, 15, 20, 25, 30] satisfies TimerMinutes[];

const quickTimers: TimerHubLink[] = quickTimerMinutes
  .filter((minutes) => timers.includes(minutes))
  .map((minutes) => ({
    label: `${minutes} minute timer`,
    href: getTimerPath(minutes),
    description: getQuickTimerDescription(minutes),
  }));

const focusTimers: TimerHubLink[] = [
  {
    label: "Focus timer",
    href: getTimerToolPath("focus-timer"),
    description: "A quiet timer for one meaningful work session at a time.",
  },
  {
    label: "25 minute timer",
    href: getTimerPath(25),
    description: "A familiar focus block for Pomodoro work or compact tasks.",
  },
  {
    label: "50 minute timer",
    href: getTimerPath(50),
    description: "A longer interval for deep work, writing, or coding.",
  },
  {
    label: "90 minute timer",
    href: getTimerPath(90),
    description: "A substantial block for demanding work with a real break after.",
  },
];

const studyAndPomodoroTimers: TimerHubLink[] = [
  {
    label: "Study timer",
    href: getTimerToolPath("study-timer"),
    description: "Plan reading, revision, homework, or practice sessions.",
  },
  {
    label: "Pomodoro timer",
    href: getTimerToolPath("pomodoro-timer"),
    description: "Use a calm 25 minute work interval with purposeful breaks.",
  },
  {
    label: "Countdown timer",
    href: getTimerToolPath("countdown-timer"),
    description: "Set a simple countdown for meetings, chores, workouts, or resets.",
  },
];

const adhdFriendlyTimers: TimerHubLink[] = [
  {
    label: "ADHD timer",
    href: "/adhd-timer",
    description: "A low-friction timer for starting tasks and staying with them.",
  },
  {
    label: "5 minute task start",
    href: getTimerPath(5),
    description: "Make beginning smaller with one tiny next action.",
  },
  {
    label: "10 minute reset",
    href: getTimerPath(10),
    description: "Return after an interruption or low-energy moment.",
  },
  {
    label: "15 minute focus block",
    href: getTimerPath(15),
    description: "Give one useful task enough room to become easier.",
  },
];

const sections = [
  {
    id: "quick-timers",
    eyebrow: "Quick timers",
    title: "Choose a short, clear countdown.",
    body:
      "Use these common durations for breathing breaks, task starts, quick resets, and short focus sessions.",
    links: quickTimers,
  },
  {
    id: "focus-timers",
    eyebrow: "Focus timers",
    title: "Protect a deeper work session.",
    body:
      "Pick a timer that gives writing, coding, planning, or creative work a visible boundary.",
    links: focusTimers,
  },
  {
    id: "study-pomodoro-timers",
    eyebrow: "Study and Pomodoro timers",
    title: "Make learning and repeatable intervals easier to begin.",
    body:
      "Use these timers for reading, revision, practice questions, assignments, and Pomodoro cycles.",
    links: studyAndPomodoroTimers,
  },
  {
    id: "adhd-friendly-timers",
    eyebrow: "ADHD-friendly timers",
    title: "Start smaller when attention feels hard to gather.",
    body:
      "These links favor low-friction starts and honest session lengths. DeepFlow is not a medical tool.",
    links: adhdFriendlyTimers,
  },
] as const;

export default function TimersPage() {
  return (
    <>
      <section className="timers-hub-hero">
        <InteractiveBrainwaveBackground />
        <div className="shell timers-hub-hero__grid">
          <div>
            <span className="eyebrow">DeepFlow timers</span>
            <h1>Free online focus timers</h1>
            <p>
              Choose a calm timer for quick resets, deep work, study sessions,
              breathing breaks, and focused tasks.
            </p>
            <div className="hero__actions">
              <Link className="button button--dark button--large" href="/timer/25">
                Start a 25 minute timer
                <ArrowIcon />
              </Link>
              <Link className="button button--ghost button--large" href="/tools/focus-timer">
                Open focus timer
              </Link>
            </div>
          </div>
          <div className="timers-hub-hero__panel" aria-label="Timer hub highlights">
            <div>
              <TimerIcon />
              <strong>Common durations</strong>
              <span>5, 10, 15, 20, 25, and 30 minute timers</span>
            </div>
            <div>
              <TargetIcon />
              <strong>Focus modes</strong>
              <span>Focus, study, Pomodoro, countdown, and ADHD-friendly pages</span>
            </div>
            <div>
              <SparkIcon />
              <strong>Calm workspace</strong>
              <span>No account required to start a timer</span>
            </div>
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <section
          className="section timer-hub-section"
          id={section.id}
          key={section.id}
        >
          <div className="shell">
            <div className="section-heading section-heading--split">
              <div>
                <span className="eyebrow">{section.eyebrow}</span>
                <h2>{section.title}</h2>
              </div>
              <p>{section.body}</p>
            </div>
            <div className="timer-hub-grid">
              {section.links.map((link) => (
                <Link className="timer-hub-card" href={link.href} key={link.href}>
                  <span className="timer-hub-card__icon">
                    <TimerIcon />
                  </span>
                  <span>
                    <strong>{link.label}</strong>
                    <small>{link.description}</small>
                  </span>
                  <ArrowIcon />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

function getQuickTimerDescription(minutes: TimerMinutes) {
  switch (minutes) {
    case 5:
      return "A small reset for breathing, setup, or beginning one tiny task.";
    case 10:
      return "A short countdown for quick tasks, transitions, and low-energy starts.";
    case 15:
      return "A compact focus block for email, reading, cleanup, or review.";
    case 20:
      return "Enough room to make visible progress without committing your whole day.";
    case 25:
      return "The classic Pomodoro-length work session for one focused task.";
    case 30:
      return "A practical half-hour block for study, planning, or focused work.";
    default:
      return "A calm countdown for one clear commitment.";
  }
}
