"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Scores } from "@/lib/data/assessment";

const BENCHMARK = 3.5;

function CustomTick({
  x,
  y,
  payload,
  textAnchor,
}: {
  x: string | number;
  y: string | number;
  payload: { value: string };
  textAnchor?: string;
}) {
  const lines = payload.value.split("\n");
  return (
    <text
      x={x}
      y={y}
      textAnchor={
        (textAnchor as React.SVGAttributes<SVGTextElement>["textAnchor"]) ??
        "middle"
      }
      fill="#94A3B8"
      fontSize={11}
      fontFamily="var(--font-sans)"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 14}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export default function ResultsRadar({ scores }: { scores: Scores }) {
  const data = [
    {
      subject: "Thinking &\nStrategy",
      you: scores.thinkingStrategy,
      benchmark: BENCHMARK,
    },
    {
      subject: "Execution",
      you: scores.execution,
      benchmark: BENCHMARK,
    },
    {
      subject: "Technical\nFluency",
      you: scores.technicalFluency,
      benchmark: BENCHMARK,
    },
    {
      subject: "User &\nResearch",
      you: scores.userResearch,
      benchmark: BENCHMARK,
    },
    {
      subject: "Communication",
      you: scores.communication,
      benchmark: BENCHMARK,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid stroke="rgba(56, 189, 248, 0.12)" strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="subject"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tick={(props: any) => <CustomTick {...props} />}
        />
        {/* Benchmark ring */}
        <Radar
          name="Entry-level PM target"
          dataKey="benchmark"
          stroke="rgba(148, 163, 184, 0.4)"
          fill="transparent"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
        />
        {/* User scores */}
        <Radar
          name="You"
          dataKey="you"
          stroke="#38BDF8"
          fill="rgba(56, 189, 248, 0.18)"
          strokeWidth={2}
          dot={{ fill: "#38BDF8", strokeWidth: 0, r: 4 }}
        />
        <Legend
          iconSize={10}
          wrapperStyle={{ fontSize: "11px", color: "#94A3B8", paddingTop: "8px" }}
          formatter={(value) => (
            <span style={{ color: "#94A3B8" }}>{value}</span>
          )}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
