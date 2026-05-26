import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { summarizeMeeting } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Disclaimer } from "@/components/feature-shell";

export const Route = createFileRoute("/app/notes")({ component: NotesPage });

function NotesPage() {
  const qc = useQueryClient();
  const fn = useServerFn(summarizeMeeting);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const recent = useQuery({
    queryKey: ["summaries"],
    queryFn: async () => (await supabase.from("meeting_summaries").select("*").order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  const mut = useMutation({
    mutationFn: () => fn({ data: { title: title || undefined, notes } }),
    onSuccess: () => { toast.success("Summary ready"); qc.invalidateQueries({ queryKey: ["summaries"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={FileText} title="Meeting Notes Summarizer" desc="Paste raw notes — get key points, actions, and deadlines." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div><Label>Meeting title (optional)</Label><Input value={title} onChange={(e)=>setTitle(e.target.value)} /></div>
          <div><Label>Raw notes / transcript</Label><Textarea rows={14} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Paste meeting notes here…" /></div>
          <Button disabled={mut.isPending || notes.length < 20} onClick={()=>mut.mutate()}>
            <Sparkles className="h-4 w-4" /> {mut.isPending ? "Summarizing…" : "Summarize"}
          </Button>
          <Disclaimer />
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-display text-lg font-semibold">Summary</h3>
          {mut.isPending && <p className="mt-4 animate-pulse text-sm text-muted-foreground">Distilling key points…</p>}
          {mut.data && <div className="prose-chat mt-4 text-sm"><ReactMarkdown>{mut.data.summary}</ReactMarkdown></div>}
          {!mut.data && !mut.isPending && <p className="mt-4 text-sm text-muted-foreground">The structured summary will appear here.</p>}
        </div>
      </div>

      {(recent.data?.length ?? 0) > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-display text-lg font-semibold">Recent summaries</h3>
          <ul className="mt-3 divide-y">
            {recent.data!.map((r) => (
              <li key={r.id} className="py-3">
                <div className="text-sm font-medium">{r.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
