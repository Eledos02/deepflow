import type { SeoPage } from "@/content/types";

export const guides: SeoPage[] = [
  {
    slug: "deep-work",
    eyebrow: "Deep work guide",
    title: "How to do deep work in a distracted world",
    description:
      "A practical system for protecting attention, planning focus sessions, and producing your most valuable work.",
    keywords: ["deep work", "how to focus", "focus sessions", "productive work"],
    sections: [
      {
        title: "What deep work actually means",
        body: [
          "Deep work is sustained, distraction-free concentration on a cognitively demanding task. It is not simply being busy for a long time. The work should stretch your ability and create an outcome that would be difficult to reproduce while multitasking.",
          "The practical value is straightforward: when attention is protected, complex thinking becomes faster and the quality of the result improves.",
        ],
      },
      {
        title: "Create a repeatable starting ritual",
        body: [
          "Decide what you will work on, what done looks like, and how long you will focus before the session begins. Close communication tools, remove the phone from reach, and keep only the materials required for the task.",
          "A timer can act as a commitment device. During the block, your job is not to finish everything. Your job is to stay with the chosen task until the interval ends.",
        ],
      },
      {
        title: "Use intervals that match the work",
        body: [
          "Use 25 to 50 minutes when you are rebuilding focus or working through resistance. Use 60 to 90 minutes for writing, design, analysis, and other work that benefits from a longer cognitive runway.",
          "Breaks are part of the system, not a reward for surviving it. Stand up, look away from the screen, and let your attention reset before beginning again.",
        ],
      },
    ],
    faqs: [
      {
        question: "How many hours of deep work can someone do each day?",
        answer:
          "For most people, two to four high-quality hours is substantial. Beginners may start with one protected session and build capacity gradually.",
      },
      {
        question: "Is music helpful for deep work?",
        answer:
          "Familiar, non-lyrical audio can help mask distractions for some people. If you notice yourself following the music, silence or neutral background noise is usually better.",
      },
    ],
  },
  {
    slug: "pomodoro-technique",
    eyebrow: "Productivity method",
    title: "The Pomodoro Technique, made practical",
    description:
      "Learn how to use focused intervals, intentional breaks, and simple planning to make steady progress.",
    keywords: ["pomodoro technique", "pomodoro method", "time blocking"],
    sections: [
      {
        title: "The basic cycle",
        body: [
          "Choose one task, work on it for 25 minutes, then take a five-minute break. After four focus intervals, take a longer break. The constraints make starting easier and create regular moments to recover.",
        ],
      },
      {
        title: "Adapt the method without losing it",
        body: [
          "The exact numbers are less important than the rhythm. If 25 minutes interrupts your best work, try a 50-minute focus interval and a 10-minute break. Keep the task specific and the break deliberate.",
        ],
      },
    ],
    faqs: [
      {
        question: "What should I do if I finish early?",
        answer:
          "Use the remaining interval to review the result, capture the next action, or improve the work. Avoid filling the time with unrelated inbox activity.",
      },
      {
        question: "Should I pause for interruptions?",
        answer:
          "For avoidable interruptions, record the thought and continue. For genuinely urgent interruptions, stop the session and begin a fresh interval when you return.",
      },
    ],
  },
  {
    slug: "focus-better",
    eyebrow: "Focus guide",
    title: "How to focus better without relying on willpower",
    description:
      "Design an environment and routine that makes concentration easier before motivation enters the equation.",
    keywords: ["how to focus better", "improve concentration", "avoid distractions"],
    sections: [
      {
        title: "Reduce the number of decisions",
        body: [
          "Focus becomes easier when the next action is already defined. Before a session, write a concrete target such as draft the introduction or solve the first three problems. Vague goals invite avoidance.",
        ],
      },
      {
        title: "Make distraction inconvenient",
        body: [
          "Log out of high-friction websites, silence nonessential notifications, and place your phone beyond arm's reach. Small environmental changes are more dependable than repeatedly negotiating with yourself.",
        ],
      },
      {
        title: "Measure starts, not perfect days",
        body: [
          "Build consistency around beginning one focus session. Once the ritual is stable, increase the duration or number of sessions. A modest system you repeat is more useful than an ideal schedule you avoid.",
        ],
      },
    ],
    faqs: [
      {
        question: "Why can I not focus even when the task matters?",
        answer:
          "Important tasks are often ambiguous, emotionally uncomfortable, or too large. Shrink the next action, define a short interval, and remove the easiest escape routes.",
      },
      {
        question: "How long does it take to improve focus?",
        answer:
          "You can improve the conditions immediately, but sustained attention develops through repetition. Track consistent sessions over several weeks rather than judging a single day.",
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
