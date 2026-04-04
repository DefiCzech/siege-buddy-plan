import { useState } from "react";
import { useSchedule } from "@/hooks/use-schedule";
import { ActivityManager } from "@/components/ActivityManager";
import { CategoryManager } from "@/components/CategoryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Tags, Loader2 } from "lucide-react";

const Manage = () => {
  const { schedule, updateSchedule, loading } = useSchedule();

  if (loading) {
    return (
      <main className="container max-w-6xl mx-auto px-4 py-24 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="container max-w-6xl mx-auto px-4 py-6 space-y-8">

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
