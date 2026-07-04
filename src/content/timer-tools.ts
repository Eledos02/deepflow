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
  internalLinks?: Array<{ href: string; label: string; description: string }>;
};

export const timerTools: TimerTool[] = [
  {
    slug: "focus-timer",
    kind: "focus",
    eyebrow: "Online focus timer",
    title: "Free focus timer for deep work",
    shortTitle: "Focus",
    seoTitle: "Focus Timer - Free Online Timer for Deep Work",
    description:
      "Use DeepFlow's free focus timer to start one task, protect a deep work session, and save what you finished in a private Focus Journal.",
    defaultMinutes: 50,
    presets: [25, 50, 90],
    keywords: [
      "focus timer",
      "online focus timer",
      "free focus timer",
      "deep work timer",
      "work timer",
      "task timer",
      "focus session timer",
    ],
    benefits: [
      {
        title: "Start one task quickly",
        description:
          "Name the work, choose a session length, and begin without creating an account.",
      },
      {
        title: "Keep a private record",
        description:
          "Completed focus sessions are saved locally so your Focus Journal can show what you finished.",
      },
      {
        title: "Stay out of noisy analytics",
        description:
          "DeepFlow keeps the timer calm, readable, and useful without turning focus into a score.",
      },
    ],
    sections: [
      {
        title: "What is a focus timer?",
        paragraphs: [
          "A focus timer is a simple boundary for one meaningful task. Instead of trying to manage the whole day at once, you decide what deserves attention now, choose a realistic interval, and protect that commitment until the timer ends.",
          "DeepFlow keeps the focus timer free to start and intentionally quiet. The page gives you the clock, an intention field, sound and notification controls, and a local record of completed sessions without requiring an account before you begin.",
        ],
      },
      {
        title: "How to use this focus timer",
        paragraphs: [
          "Write the result you want from the session before pressing start. A useful intention is concrete enough to recognize later, such as draft the introduction, review one pull request, solve five practice problems, or outline the next launch email.",
          "When the session ends, take a real break and capture the next action. Completed sessions can become part of your private Focus Journal, so tomorrow's work starts with less friction.",
        ],
      },
      {
        title: "Best session lengths for focused work",
        paragraphs: [
          "Use 25 minutes when starting feels difficult or when the task is compact. Use 50 or 60 minutes for writing, coding, planning, and study blocks that need more continuity. Reserve 90 minutes for prepared deep work with a clear recovery break afterward.",
          "The best focus session timer is the one you can repeat without draining your attention. DeepFlow gives you flexible presets because deep work, admin, study, and creative production do not all fit the same container.",
        ],
      },
      {
        title: "Focus timer vs Pomodoro timer",
        paragraphs: [
          "A Pomodoro timer usually follows a structured rhythm of 25 minutes of work and short breaks. A flexible focus timer is better when the task needs a longer runway, when you want one uninterrupted block, or when your energy calls for a different session length.",
          "Both approaches can support deep work. Use Pomodoro when you need a repeatable work-break cadence, and use the focus timer when one task needs a protected container without extra ceremony.",
        ],
      },
      {
        title: "Why DeepFlow is more than a timer",
        paragraphs: [
          "A simple timer can start a session, but DeepFlow helps the session become a practice. Your completed work can feed a private Focus Journal, repeatable routines, weekly goals, and quiet insights about when focused work actually happens.",
          "You can use the focus timer locally without an account. Creating an account is optional and useful when you want cloud backup for sessions, routines, and goals across devices.",
        ],
      },
    ],
    faqs: [
      {
        question: "How long should a deep work session be?",
        answer:
          "Start with 50 minutes if you are building focus endurance. Experienced practitioners often use 60 to 90 minute sessions, followed by a real break.",
      },
      {
        question: "Is this focus timer free?",
        answer:
          "Yes. You can start a focus session, set an intention, pause, resume, and complete the timer without creating an account.",
      },
      {
        question: "Do I need an account to use the Focus Journal?",
        answer:
          "No. Completed sessions are saved locally in your browser. An account is only needed when you want optional cloud backup across devices.",
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
    internalLinks: [
      {
        href: "/workspace",
        label: "DeepFlow Workspace",
        description:
          "Open the local-first workspace for Focus Journal, routines, goals, insights, and notes.",
      },
      {
        href: "/tools/pomodoro-timer",
        label: "Pomodoro Timer",
        description:
          "Use structured work and break cycles when you want a repeatable 25 minute rhythm.",
      },
      {
        href: "/tools/study-timer",
        label: "Study Timer",
        description:
          "Plan reading, revision, assignments, and active recall sessions with less friction.",
      },
      {
        href: "/tools/countdown-timer",
        label: "Countdown Timer",
        description:
          "Choose a simple countdown for meetings, breaks, chores, and short task blocks.",
      },
      {
        href: "/adhd-timer",
        label: "ADHD-friendly Timer",
        description:
          "Start smaller when attention feels hard to gather. DeepFlow is not a medical tool.",
      },
      {
        href: "/guides/focus-better",
        label: "How to Focus Better",
        description:
          "Build practical habits that make concentration less dependent on willpower.",
      },
      {
        href: "/guides/deep-work",
        label: "Deep Work Guide",
        description:
          "Learn how to prepare, protect, and recover from demanding focus sessions.",
      },
    ],
  },
  {
    slug: "pomodoro-timer",
    kind: "pomodoro",
    eyebrow: "Pomodoro timer",
    title: "Free Pomodoro timer for focused work",
    shortTitle: "Pomodoro",
    seoTitle: "Pomodoro Timer - Free Online Pomodoro for Focus",
    description:
      "Start a calm Pomodoro timer for focused work, studying, or writing. Use DeepFlow to protect one task and build a repeatable focus rhythm.",
    defaultMinutes: 25,
    presets: [25, 5, 15],
    keywords: [
      "pomodoro timer",
      "pomodoro timer online",
      "pomodoro technique timer",
      "free pomodoro timer",
      "online pomodoro",
      "25 minute timer",
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
    sections: [
      {
        title: "What is the Pomodoro technique?",
        paragraphs: [
          "The Pomodoro Technique is a work-and-break rhythm: choose one task, focus for a defined interval, then take a deliberate recovery break. The classic pattern uses 25 minutes of focused work and a 5 minute break, with a longer break after several rounds.",
          "DeepFlow keeps the Pomodoro timer online and calm. You can start with the classic focus interval, switch to short or long breaks, and keep the session centered on one clear intention.",
        ],
      },
      {
        title: "How a Pomodoro session works",
        paragraphs: [
          "Before the timer starts, write the outcome you want from this round. During the focus interval, treat unrelated thoughts as notes for later rather than instructions to switch tasks. When the alert sounds, stop cleanly and take the break seriously.",
          "A Pomodoro session works best when the break is restorative rather than another stream of input. Stand up, rest your eyes, drink water, or move briefly before beginning the next focus round.",
        ],
      },
      {
        title: "Pomodoro timer vs flexible focus timer",
        paragraphs: [
          "Use Pomodoro when resistance is high, when you want frequent recovery, or when a 25 minute container makes the task easier to begin. The structure is useful for studying, writing, admin, and repeatable daily work.",
          "Use a flexible focus timer when the task needs more continuity, such as coding, deep writing, strategy, or research. DeepFlow links both approaches so you can choose the rhythm that fits the work instead of forcing every task into one method.",
        ],
      },
      {
        title: "How DeepFlow supports focus beyond one Pomodoro",
        paragraphs: [
          "DeepFlow is more than a free Pomodoro timer. Completed sessions can build a private Focus Journal, show weekly momentum, and help you return to routines that work without turning attention into a noisy productivity dashboard.",
          "You can use the Pomodoro timer without signing in. Creating an account is optional and useful when you want cloud backup for sessions, routines, and goals across devices.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the Pomodoro Technique?",
        answer:
          "It is a time-management method that alternates focused work intervals, traditionally 25 minutes, with short breaks. After several sessions, you take a longer break.",
      },
      {
        question: "Is this Pomodoro timer free?",
        answer:
          "Yes. You can use the focus and break intervals, local session history, sound alert, and browser notifications without creating an account.",
      },
      {
        question: "When should I use Pomodoro instead of a longer focus timer?",
        answer:
          "Use Pomodoro when you want frequent breaks or need help starting. Use a longer focus timer when writing, coding, research, or deep work needs more uninterrupted context.",
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
    internalLinks: [
      {
        href: "/tools/focus-timer",
        label: "Focus Timer",
        description:
          "Open a flexible focus session when one task needs a longer protected block.",
      },
      {
        href: "/tools/study-timer",
        label: "Study Timer",
        description:
          "Use study-focused sessions for reading, recall, revision, and assignments.",
      },
      {
        href: "/timer/25",
        label: "25 Minute Timer",
        description:
          "Open the classic Pomodoro-length focus interval as a simple countdown.",
      },
      {
        href: "/timer/50",
        label: "50 Minute Timer",
        description:
          "Try an extended 50/10 rhythm when a task needs more continuity.",
      },
      {
        href: "/guides/pomodoro-technique",
        label: "Pomodoro Technique Guide",
        description:
          "Learn how to adapt the classic method without losing its useful rhythm.",
      },
      {
        href: "/guides/deep-work-vs-pomodoro",
        label: "Deep Work vs Pomodoro",
        description:
          "Compare structured Pomodoro cycles with longer deep work sessions.",
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
  return `/tools/${slug}`;
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
