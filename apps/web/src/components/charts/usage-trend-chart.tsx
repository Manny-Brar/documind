import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Neobrutalism chart colors
const CHART_COLORS = {
  search: "#93c5fd",  // blue
  llm: "#f9a8d4",     // pink
  stroke: "#000000",
};

interface UsageTrendChartProps {
  data: Array<{
    date: Date | string;
    embedding?: number;
    search?: number;
    llm?: number;
    storage?: number;
    totalCost?: number;
  }>;
}

export function UsageTrendChart({ data }: UsageTrendChartProps) {
  // Format data for the chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    searches: item.search ?? 0,
    aiTokens: Math.round((item.llm ?? 0) / 1000), // Show in thousands
  }));

  // Handle empty data
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No usage data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fontFamily: "monospace" }}
          tickLine={{ stroke: CHART_COLORS.stroke }}
          axisLine={{ stroke: CHART_COLORS.stroke, strokeWidth: 2 }}
        />
        <YAxis
          tick={{ fontSize: 11, fontFamily: "monospace" }}
          tickLine={{ stroke: CHART_COLORS.stroke }}
          axisLine={{ stroke: CHART_COLORS.stroke, strokeWidth: 2 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "2px solid #000000",
            borderRadius: "2px",
            boxShadow: "4px 4px 0 #000000",
            fontFamily: "monospace",
          }}
          formatter={(value, name) => {
            if (name === "aiTokens") return [`${value}K tokens`, "AI Tokens"];
            return [value, "Searches"];
          }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#000" }}>
              {value === "searches" ? "Searches" : "AI Tokens (K)"}
            </span>
          )}
        />
        <Bar
          dataKey="searches"
          fill={CHART_COLORS.search}
          stroke={CHART_COLORS.stroke}
          strokeWidth={2}
          name="searches"
        />
        <Bar
          dataKey="aiTokens"
          fill={CHART_COLORS.llm}
          stroke={CHART_COLORS.stroke}
          strokeWidth={2}
          name="aiTokens"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
