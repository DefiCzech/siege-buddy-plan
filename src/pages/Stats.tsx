import { useSchedule } from "@/hooks/use-schedule";
import { TrainingStats } from "@/components/TrainingStats";

const Stats = () => {
  const { schedule } = useSchedule();

  return (
    <main className="container max-w-6xl mx-auto px-4 py-6">
      <TrainingStats
        entries={schedule.entries}
        activities={schedule.activities}
        categories={schedule.categories}
      />
    </main>
  );
};

export default Stats;
