import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { researchTopic } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Disclaimer } from "@/components/feature-shell";

export const Route = createFileRoute("/app/research")({ component: ResearchPage });

function ResearchPage() {
  const qc = useQueryClient();
  const fn = useServerFn(researchTopic);
  const [topic, setTopic] = useState("");
  const [focus, setFocus] = useState("");

  const recent = useQuery({
    queryKey: ["research"],
    queryFn: async () => (await supabase.from("research_notes").select("*").order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  const mut = useMutation({
    mutationFn: () => fn({ data: { topic, focus: focus || undefined } }),
    onSuccess: () => { toast.success("Research ready"); qc.invalidateQueries({ queryKey: ["research"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={Search} title="AI Research Assistant" desc="Insights, considerations, and next steps on any topic." />

      <div className="rounded-2xl border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div><Label>Topic</Label><Input value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="e.g. Vector databases for SaaS search" /></div>
          <div><Label>Focus (optional)</Label><Input value={focus} onChange={(e)=>setFocus(e.target.value)} placeholder="e.g. Cost vs. latency tradeoffs" /></div>
          <div className="flex items-end"><Button disabled={mut.isPending || !topic} onClick={()=>mut.mutate()}><Sparkles className="h-4 w-4" /> {mut.isPending ? "Researching…" : "Research"}</Button></div>
        </div>
        <Disclaimer />
      </div>

      {mut.data && (
        <div className="rounded-2xl border bg-card p-6">
          <div className="prose-chat text-sm"><ReactMarkdown>{mut.data.summary}</ReactMarkdown></div>
        </div>
      )}

      {(recent.data?.length ?? 0) > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-display text-lg font-semibold">Recent research</h3>
          <ul className="mt-3 divide-y">
            {recent.data!.map((r) => (
              <li key={r.id} className="py-3">
                <div className="text-sm font-medium">{r.topic}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
