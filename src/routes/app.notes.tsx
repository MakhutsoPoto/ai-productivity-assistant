import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { summarizeMeeting, transcribeAndSummarizeAudio } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Disclaimer } from "@/components/feature-shell";
import { PromptChips } from "@/components/prompt-chips";
import { ListenButton } from "@/components/listen-button";
import { notesExamples } from "@/lib/example-prompts";

export const Route = createFileRoute("/app/notes")({ component: NotesPage });

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:*/*;base64,"
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function NotesPage() {
  const qc = useQueryClient();
  const summarizeFn = useServerFn(summarizeMeeting);
  const audioFn = useServerFn(transcribeAndSummarizeAudio);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const audioInput = useRef<HTMLInputElement>(null);

  const recent = useQuery({
    queryKey: ["summaries"],
    queryFn: async () => (await supabase.from("meeting_summaries").select("*").order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  const mut = useMutation({
    mutationFn: () => summarizeFn({ data: { title: title || undefined, notes } }),
    onSuccess: () => { toast.success("Summary ready"); qc.invalidateQueries({ queryKey: ["summaries"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const audioMut = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_AUDIO_BYTES) throw new Error("Audio must be 25 MB or smaller.");
      const audioBase64 = await fileToBase64(file);

      // Also store the raw file in private storage for the user's records.
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const path = `${auth.user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        await supabase.storage.from("meeting-audio").upload(path, file, { contentType: file.type, upsert: false });
      }

      return audioFn({ data: { audioBase64, mimeType: file.type || "audio/mpeg", title: audioTitle || file.name } });
    },
    onSuccess: () => { toast.success("Audio transcribed and summarized"); qc.invalidateQueries({ queryKey: ["summaries"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={FileText} title="Smart Meeting Notes" desc="Paste notes or upload audio — get key points, actions, and deadlines." />

      <Tabs defaultValue="text">
        <TabsList>
          <TabsTrigger value="text">Paste notes</TabsTrigger>
          <TabsTrigger value="audio">Upload audio</TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border bg-card p-5">
              <div><Label>Meeting title (optional)</Label><Input value={title} onChange={(e)=>setTitle(e.target.value)} /></div>
              <div>
                <Label>Raw notes / transcript</Label>
                <Textarea rows={12} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Paste meeting notes here…" />
              </div>
              <PromptChips
                examples={notesExamples}
                labelOf={(s) => s.slice(0, 24) + "…"}
                onPick={(s) => setNotes(s)}
                onCustom={() => setNotes("")}
              />
              <Button disabled={mut.isPending || notes.length < 20} onClick={()=>mut.mutate()} className="bg-[#4b5563] text-white hover:bg-[#374151]">
                <Sparkles className="h-4 w-4" /> {mut.isPending ? "Summarizing…" : "Summarize"}
              </Button>
              <Disclaimer />
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-display text-lg font-semibold">Summary</h3>
              {mut.isPending && <p className="mt-4 animate-pulse text-sm text-muted-foreground">Distilling key points…</p>}
              {mut.data && (
                <>
                  <div className="prose-chat mt-4 text-sm"><ReactMarkdown>{mut.data.summary}</ReactMarkdown></div>
                  <div className="mt-3"><ListenButton text={mut.data.summary} /></div>
                </>
              )}
              {!mut.data && !mut.isPending && <p className="mt-4 text-sm text-muted-foreground">The structured summary will appear here.</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audio">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border bg-card p-5">
              <div><Label>Meeting title (optional)</Label><Input value={audioTitle} onChange={(e)=>setAudioTitle(e.target.value)} /></div>
              <div>
                <Label>Audio file</Label>
                <input
                  ref={audioInput}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) audioMut.mutate(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  onClick={() => audioInput.current?.click()}
                  disabled={audioMut.isPending}
                  className="bg-[#4b5563] text-white hover:bg-[#374151]"
                >
                  <Upload className="h-4 w-4" /> {audioMut.isPending ? "Transcribing & summarizing…" : "Choose audio file"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">Up to 25 MB · mp3, wav, m4a, webm. Mothusi transcribes then summarizes.</p>
              </div>
              <Disclaimer />
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-display text-lg font-semibold">Result</h3>
              {audioMut.isPending && <p className="mt-4 animate-pulse text-sm text-muted-foreground">Transcribing audio…</p>}
              {audioMut.data && (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</div>
                    <div className="prose-chat mt-2 text-sm"><ReactMarkdown>{audioMut.data.summary}</ReactMarkdown></div>
                    <div className="mt-2"><ListenButton text={audioMut.data.summary} /></div>
                  </div>
                  <details className="rounded-lg border bg-background p-3 text-sm">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">View transcript</summary>
                    <p className="mt-2 whitespace-pre-wrap">{audioMut.data.transcript}</p>
                  </details>
                </div>
              )}
              {!audioMut.data && !audioMut.isPending && <p className="mt-4 text-sm text-muted-foreground">Upload audio to see a transcript and summary here.</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
