import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

// Neobrutalism chart colors
const CHART_COLORS = [
  "#fef08a", // yellow
  "#93c5fd", // blue
  "#f9a8d4", // pink
  "#6ee7b7", // mint
  "#ddd6fe", // lavender
  "#fca5a5", // coral
];

// File type labels
const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "Word",
  pptx: "PowerPoint",
  xlsx: "Excel",
  txt: "Text",
  md: "Markdown",
};

interface DocumentTypeChartProps {
  data: Array<{ type: string; count: number }>;
}

export function DocumentTypeChart({ data }: DocumentTypeChartProps) {
  // Format data for the chart
  const chartData = data.map((item) => ({
    name: FILE_TYPE_LABELS[item.type] || item.type.toUpperCase(),
    value: item.count,
    type: item.type,
  }));

  // Handle empty data
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No documents yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          stroke="#000000"
          strokeWidth={2}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "2px solid #000000",
            borderRadius: "2px",
            boxShadow: "4px 4px 0 #000000",
            fontFamily: "monospace",
          }}
          formatter={(value, name) => [`${value} files`, name]}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="square"
          formatter={(value) => (
            <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#000" }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
