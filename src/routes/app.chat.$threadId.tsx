import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sendChatMessage, setPreferredName, getPreferredName } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Send, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PromptChips } from "@/components/prompt-chips";
import { chatExamples } from "@/lib/example-prompts";

export const Route = createFileRoute("/app/chat/$threadId")({ component: ChatThreadPage });

function ChatThreadPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(sendChatMessage);
  const saveName = useServerFn(setPreferredName);
  const fetchName = useServerFn(getPreferredName);

  const [input, setInput] = useState("");
  const [nameOpen, setNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const threads = useQuery({
    queryKey: ["threads"],
    queryFn: async () => (await supabase.from("chat_threads").select("*").order("updated_at", { ascending: false })).data ?? [],
  });

  const messages = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => (await supabase.from("chat_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: true })).data ?? [],
  });

  // First-time name onboarding
  const { data: nameInfo } = useQuery({
    queryKey: ["preferred-name"],
    queryFn: () => fetchName(),
  });
  useEffect(() => {
    if (nameInfo && !nameInfo.preferredName) setNameOpen(true);
  }, [nameInfo]);

  useEffect(() => { taRef.current?.focus(); }, [threadId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages.data]);

  const mut = useMutation({
    mutationFn: (text: string) => fn({ data: { threadId, message: text } }),
    onMutate: async (text) => {
      qc.setQueryData(["messages", threadId], (old: any[] = []) => [
        ...old,
        { id: "tmp-u", role: "user", content: text, created_at: new Date().toISOString() },
        { id: "tmp-a", role: "assistant", content: "…", created_at: new Date().toISOString(), _pending: true },
      ]);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["messages", threadId] }); qc.invalidateQueries({ queryKey: ["threads"] }); },
    onError: (e: any) => { toast.error(e.message); qc.invalidateQueries({ queryKey: ["messages", threadId] }); },
  });

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || mut.isPending) return;
    setInput("");
    mut.mutate(text);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const submitName = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nameInput.trim();
    if (!n) return;
    try {
      await saveName({ data: { name: n } });
      setNameOpen(false);
      qc.invalidateQueries({ queryKey: ["preferred-name"] });
      toast.success(`Nice to meet you, ${n}!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const newThread = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase.from("chat_threads").insert({ user_id: auth.user.id }).select("id").single();
    if (data) { qc.invalidateQueries({ queryKey: ["threads"] }); navigate({ to: "/app/chat/$threadId", params: { threadId: data.id } }); }
  };

  const deleteThread = async (id: string) => {
    await supabase.from("chat_threads").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["threads"] });
    if (id === threadId) navigate({ to: "/app/chat", replace: true });
  };

  const friendName = nameInfo?.preferredName || nameInfo?.displayName || "friend";

  return (
    <div className="mx-auto grid h-[calc(100vh-8rem)] max-w-6xl grid-cols-[260px_1fr] gap-4">
      <aside className="flex flex-col rounded-2xl border bg-card p-3">
        <Button size="sm" onClick={newThread} className="bg-[#4b5563] text-white hover:bg-[#374151]"><Plus className="h-4 w-4" /> New chat</Button>
        <div className="mt-3 flex-1 overflow-y-auto">
          {(threads.data ?? []).map((t) => (
            <div key={t.id} className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${t.id===threadId?"bg-accent text-accent-foreground":"hover:bg-muted"}`}>
              <button className="flex-1 truncate text-left" onClick={()=>navigate({ to: "/app/chat/$threadId", params: { threadId: t.id } })}>
                <MessageSquare className="mr-2 inline h-3 w-3" />{t.title}
              </button>
              <button onClick={()=>deleteThread(t.id)} className="opacity-0 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex flex-col rounded-2xl border bg-card">
        <div className="border-b px-5 py-3">
          <div className="font-display font-semibold">Mothusi</div>
          <div className="text-xs text-muted-foreground">Your AI workplace assistant · AI content may require human review.</div>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {(messages.data ?? []).length === 0 && (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              <div className="space-y-4">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground font-display text-lg">M</div>
                <div>Hey {friendName}, Mothusi here. What's on your mind?</div>
                <div className="mx-auto max-w-md">
                  <PromptChips
                    examples={chatExamples}
                    labelOf={(s) => s.length > 28 ? s.slice(0, 28) + "…" : s}
                    onPick={(s) => setInput(s)}
                    onCustom={() => { setInput(""); taRef.current?.focus(); }}
                  />
                </div>
              </div>
            </div>
          )}
          {(messages.data ?? []).map((m: any) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">{m.content}</div>
              ) : (
                <div className="prose-chat max-w-none text-sm">
                  {m._pending ? <span className="animate-pulse text-muted-foreground">Mothusi is thinking…</span> : <ReactMarkdown>{m.content}</ReactMarkdown>}
                </div>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
          <Textarea
            ref={taRef} rows={1} value={input} onChange={(e)=>setInput(e.target.value)}
            placeholder="Message Mothusi…"
            className="min-h-10 resize-none"
            onKeyDown={(e)=>{ if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <Button type="submit" size="icon" disabled={mut.isPending || !input.trim()} className="bg-[#4b5563] text-white hover:bg-[#374151]"><Send className="h-4 w-4" /></Button>
        </form>
      </section>

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hey friend, Mothusi here 👋</DialogTitle>
            <DialogDescription>What name do you prefer? I'll use it from now on.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitName} className="space-y-3">
            <Input autoFocus value={nameInput} onChange={(e)=>setNameInput(e.target.value)} placeholder="e.g. Sam" maxLength={60} required />
            <DialogFooter>
              <Button type="submit" className="bg-[#4b5563] text-white hover:bg-[#374151]">That's me</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
