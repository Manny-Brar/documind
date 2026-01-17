import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Neobrutalism chart colors
const CHART_COLORS = {
  yellow: "#fef08a",
  blue: "#93c5fd",
  pink: "#f9a8d4",
  mint: "#6ee7b7",
  stroke: "#000000",
};

interface SearchActivityChartProps {
  data: Array<{ date: Date | string; count: number }>;
}

export function SearchActivityChart({ data }: SearchActivityChartProps) {
  // Format data for the chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    searches: item.count,
  }));

  // Handle empty data
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No search activity yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          labelStyle={{ fontWeight: "bold" }}
        />
        <Area
          type="monotone"
          dataKey="searches"
          stroke={CHART_COLORS.stroke}
          strokeWidth={2}
          fill={CHART_COLORS.blue}
          fillOpacity={0.8}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
