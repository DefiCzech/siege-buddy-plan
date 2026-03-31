import { useState } from "react";
import { useSchedule } from "@/hooks/use-schedule";
import { useFriends } from "@/hooks/use-friends";
import { ActivityManager } from "@/components/ActivityManager";
import { TrainingQueue } from "@/components/TrainingQueue";
import { CategoryManager } from "@/components/CategoryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Tags, AlertTriangle, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const Manage = () => {
  const { schedule, updateSchedule, loading } = useSchedule();
  const { myShareCode } = useFriends();
  const [codeCopied, setCodeCopied] = useState(false);

  const copyShareCode = () => {
    if (!myShareCode) return;
    navigator.clipboard.writeText(myShareCode).then(() => {
      setCodeCopied(true);
      toast.success("Kód zkopírován!");
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <main className="container max-w-6xl mx-auto px-4 py-24 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="container max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Weekly schedule — always visible */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Input
            value={schedule.name}
            onChange={(e) => updateSchedule({ name: e.target.value })}
            className="text-lg font-mono font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
          />
          {myShareCode && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-primary/30 hover:border-primary font-mono text-xs shrink-0"
              onClick={copyShareCode}
              title="Zkopíruj a pošli kamarádovi, aby viděl tvůj pokrok"
            >
              {codeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {codeCopied ? "ZKOPÍROVÁNO" : myShareCode}
            </Button>
          )}
        </div>
        {schedule.activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <AlertTriangle className="h-8 w-8 mx-auto opacity-50" />
            <p>Nejdříve si přidej tréninky níže v záložce "Aktivity"</p>
          </div>
        ) : (
          <WeeklySchedule
            activities={schedule.activities}
            categories={schedule.categories}
            entries={schedule.entries}
            onChange={(entries) => updateSchedule({ entries })}
          />
        )}
      </div>

      {/* Activities & Categories tabs */}
      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="activities" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-3.5 w-3.5" />
            Aktivity
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Tags className="h-3.5 w-3.5" />
            Kategorie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <ActivityManager
            activities={schedule.activities}
            categories={schedule.categories}
            onChange={(activities) => updateSchedule({ activities })}
          />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager
            categories={schedule.categories}
            onChange={(categories) => updateSchedule({ categories })}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Manage;
