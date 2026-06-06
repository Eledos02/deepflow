import type { FaqItem } from "@/content/types";

export type TimerKind = "focus" | "pomodoro" | "countdown";

export type TimerTool = {
  slug: string;
  kind: TimerKind;
  eyebrow: string;
  title: string;
  shortTitle: string;
  description: string;
  defaultMinutes: number;
  presets: number[];
  keywords: string[];
  benefits: Array<{ title: string; description: string }>;
  faqs: FaqItem[];
};

export const timerTools: TimerTool[] = [
  {
    slug: "focus-timer",
    kind: "focus",
    eyebrow: "Deep work timer",
    title: "Make space for your best work",
    shortTitle: "Focus",
    description:
      "A distraction-free focus timer designed for deliberate, uninterrupted work.",
    defaultMinutes: 50,
    presets: [25, 50, 90],
    keywords: ["focus timer", "deep work timer", "study timer", "work timer"],
    benefits: [
      {
        title: "One clear commitment",
        description:
          "Choose a meaningful block of time and give one task your full attention.",
      },
      {
        title: "Built for flow",
        description:
          "A quiet interface keeps the clock visible without competing with your work.",
      },
      {
        title: "Accurate in the background",
        description:
          "Deadline-based timing stays reliable when you switch tabs or lock your screen.",
      },
    ],
    faqs: [
      {
        question: "How long should a deep work session be?",
        answer:
          "Start with 50 minutes if you are building focus endurance. Experienced practitioners often use 60 to 90 minute sessions, followed by a real break.",
      },
      {
        question: "Can I use this focus timer for studying?",
        answer:
          "Yes. The timer works well for reading, revision, writing, coding, and any task that benefits from an uninterrupted block.",
      },
      {
        question: "Will the timer keep running in another tab?",
        answer:
          "Yes. DeepFlow calculates time from a fixed deadline instead of counting browser ticks, which avoids common background-tab drift.",
      },
    ],
  },
  {
    slug: "pomodoro-timer",
    kind: "pomodoro",
    eyebrow: "Pomodoro timer",
    title: "Build momentum, one interval at a time",
    shortTitle: "Pomodoro",
    description:
      "A simple Pomodoro timer for focused 25-minute work sessions and restorative breaks.",
    defaultMinutes: 25,
    presets: [25, 5, 15],
    keywords: [
      "pomodoro timer",
      "25 minute timer",
      "productivity timer",
      "study pomodoro",
    ],
    benefits: [
      {
        title: "Protect your attention",
        description:
          "Short, defined sessions lower the resistance to starting demanding work.",
      },
      {
        title: "Remember to recover",
        description:
          "Switch between focus, short break, and long break intervals in one place.",
      },
      {
        title: "See your progress",
        description:
          "Completed focus sessions are counted locally as a lightweight measure of momentum.",
      },
    ],
    faqs: [
      {
        question: "What is the Pomodoro Technique?",
        answer:
          "It is a time-management method that alternates focused work intervals, traditionally 25 minutes, with short breaks. After several sessions, you take a longer break.",
      },
      {
        question: "Do I have to use 25-minute sessions?",
        answer:
          "No. Twenty-five minutes is a useful starting point, but the best interval is one you can repeat consistently without exhausting your attention.",
      },
      {
        question: "How many Pomodoro sessions should I do?",
        answer:
          "A common cycle is four focus sessions with short breaks, followed by a 15 to 30 minute break. Adjust the cycle to the difficulty of your work.",
      },
    ],
  },
  {
    slug: "countdown-timer",
    kind: "countdown",
    eyebrow: "Online countdown timer",
    title: "A clean countdown for anything",
    shortTitle: "Countdown",
    description:
      "Set a fast, accurate online countdown for meetings, workouts, study blocks, and everyday tasks.",
    defaultMinutes: 10,
    presets: [5, 10, 15, 30],
    keywords: [
      "countdown timer",
      "online timer",
      "10 minute timer",
      "free timer",
    ],
    benefits: [
      {
        title: "Ready immediately",
        description:
          "Pick a common duration and start without creating an account or configuring a workspace.",
      },
      {
        title: "Easy to read",
        description:
          "Large, high-contrast time remains legible from across a room or during a presentation.",
      },
      {
        title: "No noisy extras",
        description:
          "The essential controls stay close while the rest of the interface gets out of the way.",
      },
    ],
    faqs: [
      {
        question: "Does this online timer make a sound?",
        answer:
          "Yes. After you interact with the page and start the timer, DeepFlow plays a short, gentle tone when the countdown finishes.",
      },
      {
        question: "Can I pause and resume the countdown?",
        answer:
          "Yes. Pausing preserves the remaining time, and resuming creates a new accurate deadline.",
      },
      {
        question: "Can I use it in full screen?",
        answer:
          "The focused timer card is designed to remain readable at large browser sizes. Native full-screen mode is planned for a later product release.",
      },
    ],
  },
];

export function getTimerTool(slug: string) {
  return timerTools.find((tool) => tool.slug === slug);
}
