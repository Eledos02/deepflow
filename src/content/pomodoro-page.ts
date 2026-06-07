import type { FaqItem } from "./types";

export const pomodoroPage = {
  title: "Pomodoro Timer - Free 25 Minute Focus Timer",
  description:
    "Use DeepFlow's free Pomodoro timer for focused 25-minute work sessions, restorative breaks, studying, writing, and distraction-free productivity.",
  keywords: [
    "pomodoro timer",
    "free pomodoro timer",
    "25 minute timer",
    "pomodoro technique",
    "focus timer",
    "study timer",
  ],
  heading: "A calmer Pomodoro timer for focused work",
  intro: [
    "The Pomodoro Technique turns a large or uncomfortable task into one clear commitment: focus for 25 minutes, then step away for a short break. DeepFlow keeps that rhythm simple. Choose the focus interval, name what you intend to finish, and let the countdown protect your attention until the session ends.",
    "A Pomodoro is most useful when the timer supports the work rather than becoming another score to optimize. Silence avoidable interruptions before you begin, keep one outcome visible, and use the break for movement or recovery instead of filling it with more input. After four focused rounds, take a longer pause before starting another cycle.",
  ],
  faqs: [
    {
      question: "What is a Pomodoro timer?",
      answer:
        "A Pomodoro timer divides work into focused intervals followed by breaks. The traditional pattern uses 25 minutes of work, a 5 minute break, and a longer 15 to 30 minute break after four focus sessions.",
    },
    {
      question: "How do I use this Pomodoro timer?",
      answer:
        "Choose Focus, write a specific intention, and press Start focus. Work on that outcome until the alert, switch to a short break, and repeat. DeepFlow records completed 25 minute focus sessions locally on your device.",
    },
    {
      question: "Can I pause or reset a Pomodoro?",
      answer:
        "Yes. Pause preserves the remaining time, Resume continues the same session, and Reset returns the selected interval to its starting point. For a consistent practice, pause only for interruptions that truly cannot wait.",
    },
    {
      question: "Is the Pomodoro Technique good for studying?",
      answer:
        "Yes. Defined intervals can make revision, reading, practice questions, and writing easier to begin. Use each session for one subject or outcome, then use the break to stand up and let your attention recover.",
    },
    {
      question: "Is DeepFlow's Pomodoro timer free?",
      answer:
        "Yes. The timer, focus and break presets, local session history, sound alert, and browser notification support are available without creating an account.",
    },
  ] satisfies FaqItem[],
  durations: [
    {
      minutes: 5,
      label: "5 Minute Timer",
      description: "Use the classic short Pomodoro break.",
    },
    {
      minutes: 15,
      label: "15 Minute Timer",
      description: "Take a longer recovery break after several rounds.",
    },
    {
      minutes: 25,
      label: "25 Minute Timer",
      description: "Open the traditional Pomodoro focus interval.",
    },
    {
      minutes: 50,
      label: "50 Minute Timer",
      description: "Try an extended 50/10 focus cycle.",
    },
  ],
} as const;
