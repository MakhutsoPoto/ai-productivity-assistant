import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { planTasks } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Disclaimer } from "@/components/feature-shell";
import { PromptChips } from "@/components/prompt-chips";
import { tasksExamples } from "@/lib/example-prompts";

export const Route = createFileRoute("/app/tasks")({ component: TasksPage });

const priorityColor: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-foreground text-background",
  medium: "bg-accent text-accent-foreground",
  low: "bg-muted text-muted-foreground",
};

function TasksPage() {
  const qc = useQueryClient();
  const fn = useServerFn(planTasks);
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(7);

  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await supabase.from("tasks").select("*").order("scheduled_for", { ascending: true }).order("priority", { ascending: false })).data ?? [],
  });

  const mut = useMutation({
    mutationFn: () => fn({ data: { goal, horizonDays: days } }),
    onSuccess: (r) => { toast.success(`Planned ${r.count} tasks`); qc.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = async (id: string, status: string) => {
    const next = status === "done" ? "pending" : "done";
    await supabase.from("tasks").update({ status: next }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={ListChecks} title="AI Task Planner" desc="Turn a goal into a prioritized, scheduled task list." />

      <div className="rounded-2xl border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
          <div><Label>Goal</Label><Textarea rows={2} value={goal} onChange={(e)=>setGoal(e.target.value)} placeholder="e.g. Launch onboarding email sequence by next Friday" /></div>
          <div><Label>Horizon (days)</Label><Input type="number" min={1} max={30} value={days} onChange={(e)=>setDays(parseInt(e.target.value) || 7)} /></div>
          <div className="flex items-end"><Button disabled={mut.isPending || !goal} onClick={()=>mut.mutate()} className="bg-[#4b5563] text-white hover:bg-[#374151]"><Sparkles className="h-4 w-4" /> {mut.isPending ? "Planning…" : "Plan tasks"}</Button></div>
        </div>
        <div className="mt-3">
          <PromptChips
            examples={tasksExamples}
            labelOf={(s) => s.length > 30 ? s.slice(0, 30) + "…" : s}
            onPick={(s) => setGoal(s)}
            onCustom={() => setGoal("")}
          />
        </div>
        <Disclaimer />
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">Your tasks</h3>
        {tasks.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {(tasks.data?.length ?? 0) === 0 && !tasks.isLoading && <p className="mt-3 text-sm text-muted-foreground">No tasks yet. Generate a plan above.</p>}
        <ul className="mt-3 divide-y">
          {tasks.data?.map((t) => (
            <li key={t.id} className="flex items-start gap-3 py-3">
              <button onClick={()=>toggle(t.id, t.status)} className={`mt-0.5 grid h-5 w-5 place-items-center rounded border ${t.status==="done" ? "bg-primary text-primary-foreground" : ""}`}>
                {t.status === "done" && <Check className="h-3 w-3" />}
              </button>
              <div className="flex-1">
                <div className={`text-sm font-medium ${t.status==="done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge className={priorityColor[t.priority]}>{t.priority}</Badge>
                  {t.scheduled_for && <span>📅 {t.scheduled_for}</span>}
                  {t.estimated_minutes && <span>⏱ {t.estimated_minutes}m</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
