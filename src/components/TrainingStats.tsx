import { ScheduleEntry, TrainingActivity, Category, DAY_NAMES, R6S_MAPS } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  entries: ScheduleEntry[];
  activities: TrainingActivity[];
  categories: Category[];
}

export function TrainingStats({ entries, activities, categories }: Props) {
  const getActivity = (id: string) => activities.find((a) => a.id === id);
  const getCategory = (id: string) => categories.find((c) => c.id === id);

  const completedEntries = entries.filter((e) => e.completed);
  const totalMinutes = completedEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const completedCount = completedEntries.length;

  // Per-day data
  const dayData = DAY_NAMES.map((name, idx) => {
    const dayEntries = completedEntries.filter((e) => e.dayOfWeek === idx);
    const minutes = dayEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const count = dayEntries.length;
    return { name, minutes, count };
  });

  // Per-category data
  const categoryData = categories.map((cat) => {
    const catActivities = activities.filter((a) => a.categoryId === cat.id);
    const catEntries = completedEntries.filter((e) =>
      catActivities.some((a) => a.id === e.activityId)
    );
    const minutes = catEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const count = catEntries.length;
    return { name: `${cat.icon} ${cat.name}`, minutes, count, color: extractColor(cat.color) };
  }).filter((d) => d.count > 0);

  // Per-activity data
  const activityData = activities.map((act) => {
    const actEntries = completedEntries.filter((e) => e.activityId === act.id);
    const minutes = actEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const count = actEntries.length;
    const cat = getCategory(act.categoryId);
    return { name: act.name, minutes, count, icon: cat?.icon || "" };
  }).filter((d) => d.count > 0).sort((a, b) => b.minutes - a.minutes);

  // Per-map data — aggregate from completedMaps and assignedMaps
  const mapStats = new Map<string, { count: number; minutes: number }>();
  completedEntries.forEach((entry) => {
    const maps = entry.completedMaps || [];
    const perMapMinutes = maps.length > 0 ? Math.round((entry.durationMinutes || 0) / maps.length) : 0;
    maps.forEach((mapName) => {
      const existing = mapStats.get(mapName) || { count: 0, minutes: 0 };
      mapStats.set(mapName, {
        count: existing.count + 1,
        minutes: existing.minutes + perMapMinutes,
      });
    });
  });

  const mapData = Array.from(mapStats.entries())
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      minutes: stats.minutes,
      ranked: R6S_MAPS.find((m) => m.name === name)?.ranked ?? false,
    }))
    .sort((a, b) => b.count - a.count);

  const totalMapMinutes = mapData.reduce((sum, m) => sum + m.minutes, 0);

  if (completedCount === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground space-y-2">
        <p className="font-mono">Zatím žádné dokončené tréninky.</p>
        <p className="text-sm">Označ tréninky jako hotové a uvidíš zde statistiky.</p>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 6,
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-mono font-bold tracking-wider">// STATISTIKY</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded border border-border bg-card p-4 text-center">
          <div className="text-2xl font-mono font-bold text-primary">{completedCount}</div>
          <div className="text-xs text-muted-foreground">Dokončených tréninků</div>
        </div>
        <div className="rounded border border-border bg-card p-4 text-center">
          <div className="text-2xl font-mono font-bold text-primary">{totalMinutes}</div>
          <div className="text-xs text-muted-foreground">Celkem minut</div>
        </div>
        <div className="rounded border border-border bg-card p-4 text-center">
          <div className="text-2xl font-mono font-bold text-primary">
            {completedCount > 0 ? Math.round(totalMinutes / completedCount) : 0}
          </div>
          <div className="text-xs text-muted-foreground">Průměr min/trénink</div>
        </div>
        <div className="rounded border border-border bg-card p-4 text-center">
          <div className="text-2xl font-mono font-bold text-primary">{mapData.length}</div>
          <div className="text-xs text-muted-foreground">Naučených map</div>
        </div>
      </div>

      {/* Minutes per day chart */}
      <div className="rounded border border-border bg-card p-4 space-y-3">
        <h3 className="font-mono text-sm font-bold tracking-wide">MINUTY PODLE DNŮ</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData}>
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} min`, "Minuty"]} />
              <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-category chart */}
      {categoryData.length > 0 && (
        <div className="rounded border border-border bg-card p-4 space-y-3">
          <h3 className="font-mono text-sm font-bold tracking-wide">MINUTY PODLE KATEGORIÍ</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} min`, "Minuty"]} />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-activity table */}
      {activityData.length > 0 && (
        <div className="rounded border border-border bg-card p-4 space-y-3">
          <h3 className="font-mono text-sm font-bold tracking-wide">DETAIL PODLE AKTIVIT</h3>
          <div className="space-y-1">
            {activityData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span>
                  {item.icon} {item.name}
                </span>
                <span className="font-mono text-muted-foreground">
                  {item.count}× · {item.minutes} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map statistics */}
      {mapData.length > 0 && (
        <>
          <div className="rounded border border-border bg-card p-4 space-y-3">
            <h3 className="font-mono text-sm font-bold tracking-wide">
              🗺️ MAPY — STATISTIKY
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Celkem {totalMapMinutes} min
              </span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mapData.slice(0, 12)} layout="vertical">
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      name === "count" ? `${value}×` : `${value} min`,
                      name === "count" ? "Počet" : "Minuty",
                    ]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded border border-border bg-card p-4 space-y-3">
            <h3 className="font-mono text-sm font-bold tracking-wide">🗺️ DETAIL MAP</h3>
            <div className="space-y-1">
              {mapData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="flex items-center gap-2">
                    {item.name}
                    {item.ranked && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary font-mono">R</span>
                    )}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {item.count}× · {item.minutes} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function extractColor(colorClass: string): string {
  if (colorClass.includes("red")) return "#ef4444";
  if (colorClass.includes("blue")) return "#3b82f6";
  if (colorClass.includes("amber")) return "#f59e0b";
  if (colorClass.includes("emerald")) return "#10b981";
  if (colorClass.includes("violet")) return "#8b5cf6";
  if (colorClass.includes("cyan")) return "#06b6d4";
  if (colorClass.includes("pink")) return "#ec4899";
  if (colorClass.includes("orange")) return "#f97316";
  return "#888888";
}
