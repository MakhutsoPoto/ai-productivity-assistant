import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateEmail } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Disclaimer } from "@/components/feature-shell";
import { PromptChips } from "@/components/prompt-chips";
import { emailExamples } from "@/lib/example-prompts";

export const Route = createFileRoute("/app/email")({ component: EmailPage });

function EmailPage() {
  const qc = useQueryClient();
  const fn = useServerFn(generateEmail);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("formal");
  const [audience, setAudience] = useState("");
  const [context, setContext] = useState("");

  const recent = useQuery({
    queryKey: ["emails"],
    queryFn: async () => {
      const { data } = await supabase.from("generated_emails")
        .select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: () => fn({ data: { topic, tone: tone as any, audience, context: context || undefined } }),
    onSuccess: () => { toast.success("Email drafted"); qc.invalidateQueries({ queryKey: ["emails"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={Mail} title="Smart Email Generator" desc="Generate polished emails tuned for tone and audience." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div><Label>Topic / goal</Label><Textarea rows={3} value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="e.g. Ask client to reschedule the Q3 review" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["formal","friendly","persuasive","concise","apologetic","enthusiastic"].map(t=>(
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Audience</Label><Input value={audience} onChange={(e)=>setAudience(e.target.value)} placeholder="e.g. Senior client, engineering manager" /></div>
          </div>
          <div><Label>Extra context (optional)</Label><Textarea rows={3} value={context} onChange={(e)=>setContext(e.target.value)} placeholder="Constraints, key facts, names…" /></div>
          <PromptChips
            examples={emailExamples}
            labelOf={(e) => e.label}
            onPick={(e) => { setTopic(e.topic); setTone(e.tone); setAudience(e.audience); }}
            onCustom={() => { setTopic(""); setAudience(""); setContext(""); }}
          />
          <Button disabled={mut.isPending || !topic || !audience} onClick={() => mut.mutate()} className="bg-[#4b5563] text-white hover:bg-[#374151]">
            <Sparkles className="h-4 w-4" /> {mut.isPending ? "Generating…" : "Generate email"}
          </Button>
          <Disclaimer />
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-display text-lg font-semibold">Result</h3>
          {mut.isPending && <p className="mt-4 animate-pulse text-sm text-muted-foreground">Mothusi is drafting your email…</p>}
          {mut.data && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-muted p-3 text-sm"><span className="font-medium">Subject:</span> {mut.data.subject}</div>
              <pre className="whitespace-pre-wrap rounded-lg border bg-background p-4 text-sm leading-relaxed">{mut.data.body}</pre>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`Subject: ${mut.data!.subject}\n\n${mut.data!.body}`); toast.success("Copied"); }}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          )}
          {!mut.data && !mut.isPending && <p className="mt-4 text-sm text-muted-foreground">Your generated email will appear here.</p>}
        </div>
      </div>

      {(recent.data?.length ?? 0) > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-display text-lg font-semibold">Recent</h3>
          <ul className="mt-3 divide-y">
            {recent.data!.map((r) => (
              <li key={r.id} className="py-3">
                <div className="text-sm font-medium">{r.subject}</div>
                <div className="text-xs text-muted-foreground">{r.tone} · {r.audience} · {new Date(r.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
