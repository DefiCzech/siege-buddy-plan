import { useSchedule } from "@/hooks/use-schedule";
import { ActivityManager } from "@/components/ActivityManager";
import { WeeklySchedule } from "@/components/WeeklySchedule";
import { CategoryManager } from "@/components/CategoryManager";
import { MfaSettings } from "@/components/MfaSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Calendar, Settings, Tags, AlertTriangle, ShieldCheck } from "lucide-react";

const Manage = () => {
  const { schedule, updateSchedule } = useSchedule();

  return (
    <main className="container max-w-6xl mx-auto px-4 py-6">
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="schedule" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Rozvrh
          </TabsTrigger>
          <TabsTrigger value="activities" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-3.5 w-3.5" />
            Aktivity
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Tags className="h-3.5 w-3.5" />
            Kategorie
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Zabezpečení
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <div className="space-y-4">
            <Input
              value={schedule.name}
              onChange={(e) => updateSchedule({ name: e.target.value })}
              className="text-lg font-mono font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {schedule.activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <AlertTriangle className="h-8 w-8 mx-auto opacity-50" />
                <p>Nejdříve si přidej tréninky v záložce "Aktivity"</p>
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
        </TabsContent>

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
