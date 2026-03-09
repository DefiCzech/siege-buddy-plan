import { useState } from "react";
import { Schedule } from "@/lib/types";
import { encodeScheduleForShare } from "@/lib/schedule-store";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  schedule: Schedule;
}

export function ShareButton({ schedule }: Props) {
  const share = () => {
    const encoded = encodeScheduleForShare(schedule);
    const url = `${window.location.origin}?plan=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Odkaz zkopírován do schránky!");
    }).catch(() => {
      toast.error("Nepodařilo se zkopírovat odkaz");
    });
  };

  return (
    <Button onClick={share} variant="outline" size="sm" className="gap-2 border-primary/30 hover:border-primary">
      <Share2 className="h-4 w-4" />
      Sdílet plán
    </Button>
  );
}
