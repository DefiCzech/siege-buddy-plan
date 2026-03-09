import { Schedule } from "@/lib/types";
import { TrainingStats } from "@/components/TrainingStats";

interface Props {
  schedule: Schedule;
}

const Stats = ({ schedule }: Props) => {
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
