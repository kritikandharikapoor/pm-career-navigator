export type Dimension =
  | "thinkingStrategy"
  | "execution"
  | "technicalFluency"
  | "userResearch"
  | "communication";

export const DIMENSION_LABELS: Record<Dimension, string> = {
  thinkingStrategy: "Thinking & Strategy",
  execution: "Execution",
  technicalFluency: "Technical Fluency",
  userResearch: "User & Research",
  communication: "Communication",
};

export const DIMENSION_DESCRIPTIONS: Record<Dimension, string> = {
  thinkingStrategy: "How you break down ambiguous problems and make decisions.",
  execution: "How you track, prioritise, and ship.",
  technicalFluency: "How you work alongside engineering.",
  userResearch: "How you understand and represent your users.",
  communication: "How you influence, align, and persuade.",
};

export type OptionLabel = "A" | "B" | "C" | "D";

export type Option = {
  label: OptionLabel;
  text: string;
  score: number;
};

export type Question = {
  id: string;
  dimension: Dimension;
  text: string;
  options: Option[];
  showWhyBox: boolean;
};

export type Answers = Record<string, number>;

export type Scores = {
  thinkingStrategy: number;
  execution: number;
  technicalFluency: number;
  userResearch: number;
  communication: number;
  overall: number;
};

// ─── Question Bank ────────────────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    dimension: "thinkingStrategy",
    text: "Your company's app has seen a 20% drop in daily users over the past two weeks. Your manager asks: what's happening? What is your first move?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Check if there were any recent app updates", score: 1 },
      { label: "B", text: "Look at the data to understand which user segments dropped off and when", score: 2 },
      { label: "C", text: "Talk directly to a few users who stopped using the app", score: 1 },
      { label: "D", text: "Set up a meeting with engineering, design and marketing to brainstorm", score: 0 },
    ],
  },
  {
    id: "q2",
    dimension: "thinkingStrategy",
    text: "You have 3 features to build this quarter but your team can only deliver 2. How do you decide which ones to build?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Build what the most senior stakeholder asked for", score: 0 },
      { label: "B", text: "Estimate the impact of each feature on your north star metric and build the top 2", score: 2 },
      { label: "C", text: "Survey your most active users and build the 2 features they vote for", score: 1 },
      { label: "D", text: "Pick the 2 that are fastest to build", score: 0 },
    ],
  },
  {
    id: "q3",
    dimension: "thinkingStrategy",
    text: "A direct competitor just launched a feature your users have been asking for. What do you do?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Fast-track the same feature", score: 1 },
      { label: "B", text: "Understand why users wanted it and whether your product should solve it differently", score: 2 },
      { label: "C", text: "Ignore it", score: 0 },
      { label: "D", text: "Pause the roadmap and run a full competitive analysis", score: 1 },
    ],
  },
  {
    id: "q4",
    dimension: "execution",
    text: "You launched a new feature last week. How do you know if it is working?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Check how many users clicked on it since launch", score: 1 },
      { label: "B", text: "Compare the metric you set before launch against what you are seeing now", score: 2 },
      { label: "C", text: "Ask the customer success team what feedback they have heard", score: 1 },
      { label: "D", text: "Wait a month and check if overall revenue changed", score: 0 },
    ],
  },
  {
    id: "q5",
    dimension: "execution",
    text: "Your roadmap has 10 items. Engineering says they can only ship 3 this quarter. What do you do?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Escalate to leadership to get more engineering resources", score: 0 },
      { label: "B", text: "Prioritise based on which 3 items have the highest impact relative to effort", score: 2 },
      { label: "C", text: "Ship the 3 easiest items to show visible progress", score: 1 },
      { label: "D", text: "Cut scope across all 10 items so something moves forward on each", score: 0 },
    ],
  },
  {
    id: "q6",
    dimension: "technicalFluency",
    text: "A user reports their data is not showing up. An engineer says it is an API latency issue. What do you do?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Ask the engineer to fix it and follow up in two days", score: 0 },
      { label: "B", text: "Ask the engineer to explain the impact in plain language so you can prioritise it correctly", score: 2 },
      { label: "C", text: "Escalate immediately — any technical issue affecting users is a blocker", score: 1 },
      { label: "D", text: "Log it as a bug and move on", score: 0 },
    ],
  },
  {
    id: "q7",
    dimension: "technicalFluency",
    text: "Your team is debating whether to build a feature in-house or use a third-party tool. What matters most to you?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Which option costs less", score: 1 },
      { label: "B", text: "Which option ships faster", score: 1 },
      { label: "C", text: "Trade-offs across cost, control, maintenance, and long-term product direction", score: 2 },
      { label: "D", text: "Which option engineering is more comfortable with", score: 0 },
    ],
  },
  {
    id: "q8",
    dimension: "userResearch",
    text: "You want to understand why users are dropping off during sign-up. What is your first step?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Look at where the drop-off happens in the analytics dashboard", score: 1 },
      { label: "B", text: "Run a survey asking users why they did not complete sign-up", score: 0 },
      { label: "C", text: "Watch session recordings and speak to a few users who dropped off", score: 2 },
      { label: "D", text: "Ask the design team to redesign the sign-up flow", score: 0 },
    ],
  },
  {
    id: "q9",
    dimension: "userResearch",
    text: "You have spoken to 8 users and noticed a pattern. How confident are you in acting on it?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Very confident — 8 users is enough", score: 1 },
      { label: "B", text: "Somewhat confident — pair it with quantitative data before prioritising", score: 1 },
      { label: "C", text: "Not confident — you need at least 100 survey responses", score: 0 },
      { label: "D", text: "It depends on how representative those 8 users are of your broader user base", score: 2 },
    ],
  },
  {
    id: "q10",
    dimension: "communication",
    text: "A senior stakeholder disagrees with your product decision in a meeting. What do you do?",
    showWhyBox: false,
    options: [
      { label: "A", text: "Back down — they have more experience", score: 0 },
      { label: "B", text: "Stand your ground — you did the research", score: 1 },
      { label: "C", text: "Acknowledge their concern, share your reasoning and data, and work toward common ground", score: 2 },
      { label: "D", text: "Take it offline and revisit in a follow-up meeting", score: 1 },
    ],
  },
  {
    id: "q11",
    dimension: "communication",
    text: "You need to write a one-pager explaining a new feature to leadership. What do you lead with?",
    showWhyBox: false,
    options: [
      { label: "A", text: "The technical architecture and how the feature is built", score: 0 },
      { label: "B", text: "The user problem it solves and the business impact it is expected to create", score: 2 },
      { label: "C", text: "A comparison of what competitors are doing", score: 1 },
      { label: "D", text: "The timeline, team allocation, and resource requirements", score: 0 },
    ],
  },
];

// ─── Scoring ──────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeScores(answers: Answers): Scores {
  const g = (key: string) => answers[key] ?? 0;

  const thinkingStrategy = round1(((g("q1") + g("q2") + g("q3")) / 6) * 5);
  const execution        = round1(((g("q4") + g("q5")) / 4) * 5);
  const technicalFluency = round1(((g("q6") + g("q7")) / 4) * 5);
  const userResearch     = round1(((g("q8") + g("q9")) / 4) * 5);
  const communication    = round1(((g("q10") + g("q11")) / 4) * 5);

  const overall = round1(
    thinkingStrategy * 0.35 +
    execution        * 0.20 +
    technicalFluency * 0.10 +
    userResearch     * 0.20 +
    communication    * 0.15
  );

  return { thinkingStrategy, execution, technicalFluency, userResearch, communication, overall };
}

// ─── Archetype ────────────────────────────────────────────────────────────────

const ARCHETYPE_MAP: Partial<Record<Dimension, string>> = {
  thinkingStrategy: "The Strategist",
  technicalFluency: "The Builder",
  userResearch:     "The Advocate",
  execution:        "The Operator",
};

export function assignArchetype(scores: Scores): string {
  const dims: [Dimension, number][] = [
    ["thinkingStrategy", scores.thinkingStrategy],
    ["execution",        scores.execution],
    ["technicalFluency", scores.technicalFluency],
    ["userResearch",     scores.userResearch],
    ["communication",    scores.communication],
  ];

  dims.sort((a, b) => b[1] - a[1]);

  const [topDim, topScore] = dims[0];
  const [, secondScore]    = dims[1];

  if (topScore - secondScore >= 1.5) {
    return ARCHETYPE_MAP[topDim] ?? "The Explorer";
  }

  return "The Explorer";
}
