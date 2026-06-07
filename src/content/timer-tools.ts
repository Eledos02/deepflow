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
  seoTitle?: string;
  sections?: Array<{ title: string; paragraphs: string[] }>;
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
    slug: "study-timer",
    kind: "focus",
    eyebrow: "Online study timer",
    title: "Study with a clear beginning and finish",
    shortTitle: "Study",
    seoTitle: "Study Timer - Free Online Timer for Focused Learning",
    description:
      "Use this free study timer for focused reading, revision, practice questions, assignments, and distraction-free learning sessions.",
    defaultMinutes: 50,
    presets: [25, 50, 90],
    keywords: [
      "study timer",
      "online study timer",
      "homework timer",
      "revision timer",
      "focus timer for studying",
    ],
    benefits: [
      {
        title: "Give each session a purpose",
        description:
          "Name the chapter, problem set, or revision goal before starting so the timer protects a specific learning outcome.",
      },
      {
        title: "Match time to the material",
        description:
          "Choose 25 minutes for a compact review, 50 minutes for sustained study, or 90 minutes for demanding practice.",
      },
      {
        title: "Remember what you complete",
        description:
          "Finished study blocks are saved locally, helping you see the subjects and tasks that received focused attention.",
      },
    ],
    sections: [
      {
        title: "Turn study time into a defined session",
        paragraphs: [
          "A study plan becomes easier to follow when each block has a visible boundary and one concrete result. Instead of writing “study biology” on a list, choose an outcome such as reviewing cell respiration, answering twenty practice questions, or explaining one process without notes. Enter that intention before starting the timer. The countdown then protects a decision you have already made, reducing the temptation to switch subjects whenever the material becomes difficult.",
          "Keep the required book, notes, calculator, and reference material within reach before the session begins. Close unrelated tabs and place your phone beyond easy reach. This preparation is deliberately small, but it prevents the first minutes from disappearing into setup. When the environment supports the task, more of the selected interval can be spent reading actively, retrieving information, solving problems, or producing an assignment.",
        ],
      },
      {
        title: "Choose a study interval that fits the work",
        paragraphs: [
          "Use a 25-minute session when you are beginning, reviewing flash cards, correcting a short exercise, or working with limited energy. A 50-minute block gives dense reading, essay drafting, and multi-step problems enough room to develop without demanding an entire afternoon. Reserve 90 minutes for mock exams, substantial projects, or advanced material that benefits from continuity. Longer is not automatically better; the useful duration is the one in which attention remains accurate and repeatable.",
          "Breaks are part of the learning cycle rather than time stolen from it. After a shorter block, stand up, drink water, and look away from the screen for about five minutes. After fifty or ninety minutes, take a longer pause before beginning another demanding subject. Avoid turning the break into an open-ended feed or video session. A low-stimulation reset makes it easier to return and gives recently studied material a quiet moment to settle.",
        ],
      },
      {
        title: "Use active study methods inside the timer",
        paragraphs: [
          "A timer can protect attention, but it cannot decide whether the study method is effective. Favor activities that require an answer from memory: solve a problem without looking at the example, write what you remember after closing the book, teach the concept aloud, or create questions from the material. Retrieval exposes uncertainty quickly and gives the next session a useful target. Passive rereading can feel smooth while hiding what will be difficult to recall later.",
          "At the end of each block, spend a minute recording what was completed and where the next session should begin. Note the questions that remain unresolved instead of opening several new research paths during the countdown. This brief closure lowers the effort required to restart tomorrow. Over time, your local session history becomes a lightweight study journal showing completed blocks, total focus time, and the intentions you returned to most often.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the best timer length for studying?",
        answer:
          "Twenty-five minutes is a practical starting point, while 50 minutes often suits sustained reading or problem solving. Use 90 minutes only when the subject benefits from continuity and you can schedule a substantial break afterward.",
      },
      {
        question: "Can I use this timer for homework and assignments?",
        answer:
          "Yes. Enter the assignment or next deliverable as your intention, choose an interval, and work on that outcome until the alert. The timer works for reading, writing, revision, calculations, and project work.",
      },
      {
        question: "Should I use Pomodoro sessions for studying?",
        answer:
          "Pomodoro sessions are useful when frequent breaks make it easier to begin or sustain attention. Try the traditional 25-minute focus and 5-minute break cycle, then adjust the interval if the subject requires longer concentration.",
      },
      {
        question: "Does DeepFlow save my completed study sessions?",
        answer:
          "Yes. Completed focus sessions and their intentions are stored locally in your browser. You can review sessions from today and this week without creating an account.",
      },
      {
        question: "Is the DeepFlow study timer free?",
        answer:
          "Yes. You can start, pause, resume, and reset study sessions for free. Sound alerts, browser notifications, local history, and the available duration presets do not require an account.",
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

export function getTimerToolPath(slug: string) {
  return slug === "pomodoro-timer"
    ? "/pomodoro-timer"
    : `/tools/${slug}`;
}

export function getTimerToolContentWordCount(tool: TimerTool) {
  const text = [
    tool.title,
    tool.description,
    ...tool.benefits.flatMap((benefit) => [
      benefit.title,
      benefit.description,
    ]),
    ...(tool.sections ?? []).flatMap((section) => [
      section.title,
      ...section.paragraphs,
    ]),
    ...tool.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join(" ");

  return text.trim().split(/\s+/).length;
}
