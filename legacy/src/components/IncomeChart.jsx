import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatSom(value) {
  const num = Math.round(Number(value) || 0);
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function IncomeChart({ data }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => formatSom(value)} width={70} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => [`${formatSom(value)} so'm`, "Daromad"]} cursor={{ fill: "var(--color-secondary)" }} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.month} fill="var(--color-accent)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
