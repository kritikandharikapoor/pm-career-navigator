"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

const data = [
  { subject: "Thinking &\nStrategy", fullLabel: "Thinking & Strategy", score: 72 },
  { subject: "Execution", fullLabel: "Execution", score: 85 },
  { subject: "Technical\nFluency", fullLabel: "Technical Fluency", score: 58 },
  { subject: "User &\nResearch", fullLabel: "User & Research", score: 78 },
  { subject: "Communication", fullLabel: "Communication", score: 90 },
];

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
      textAnchor={(textAnchor as React.SVGAttributes<SVGTextElement>["textAnchor"]) ?? "middle"}
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

export default function SkillRadar() {
  return (
    <div className="relative w-full h-full">
      {/* Glow backdrop */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-10"
        style={{ background: "radial-gradient(circle, #38BDF8 0%, transparent 70%)" }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid
            stroke="rgba(56, 189, 248, 0.12)"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="subject"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tick={(props: any) => <CustomTick {...props} />}
          />
          <Radar
            dataKey="score"
            stroke="#38BDF8"
            fill="#38BDF8"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ fill: "#38BDF8", strokeWidth: 0, r: 4 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
