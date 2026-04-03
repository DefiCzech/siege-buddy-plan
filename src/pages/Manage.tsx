import { useState } from "react";
import { useSchedule } from "@/hooks/use-schedule";
import { useFriends } from "@/hooks/use-friends";
import { ActivityManager } from "@/components/ActivityManager";
import { CategoryManager } from "@/components/CategoryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, Tags, Loader2, Copy, Check } from "lucide-react";
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
      {myShareCode && (
        <div className="flex justify-end">
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
        </div>
      )}

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
