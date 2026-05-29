import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/feature-shell";

export const Route = createFileRoute("/app/meetings")({ component: MeetingsPage });

function MeetingsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");

  const meetings = useQuery({
    queryKey: ["scheduled_meetings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_meetings")
        .select("*")
        .order("starts_at", { ascending: true });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const iso = new Date(startsAt).toISOString();
      const { error } = await supabase.from("scheduled_meetings").insert({
        user_id: auth.user.id,
        title,
        notes: notes || null,
        starts_at: iso,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meeting scheduled — you'll get a reminder 30 minutes before.");
      setTitle(""); setStartsAt(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["scheduled_meetings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = async (id: string) => {
    await supabase.from("scheduled_meetings").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["scheduled_meetings"] });
  };

  const now = Date.now();
  const upcoming = (meetings.data ?? []).filter((m) => new Date(m.starts_at).getTime() >= now - 60_000);
  const past = (meetings.data ?? []).filter((m) => new Date(m.starts_at).getTime() < now - 60_000);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={CalendarClock} title="Scheduled Meetings" desc="Schedule meetings and get an in-app reminder 30 minutes before they start." />

      <form
        onSubmit={(e) => { e.preventDefault(); if (title && startsAt) create.mutate(); }}
        className="rounded-2xl border bg-card p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
          <div><Label>Title</Label><Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g. Board sync" required /></div>
          <div><Label>Starts at</Label><Input type="datetime-local" value={startsAt} onChange={(e)=>setStartsAt(e.target.value)} required /></div>
          <div className="flex items-end">
            <Button type="submit" disabled={create.isPending || !title || !startsAt} className="bg-[#4b5563] text-white hover:bg-[#374151]">
              <Plus className="h-4 w-4" /> Schedule
            </Button>
          </div>
        </div>
        <div className="mt-3"><Label>Notes (optional)</Label><Textarea rows={2} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Agenda, attendees, prep notes…" /></div>
      </form>

      <Section title="Upcoming" items={upcoming} onDelete={remove} empty="No upcoming meetings." />
      <Section title="Past" items={past} onDelete={remove} empty="No past meetings." />
    </div>
  );
}

function Section({ title, items, onDelete, empty }: { title: string; items: any[]; onDelete: (id: string) => void; empty: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y">
          {items.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(m.starts_at).toLocaleString()}</div>
                {m.notes && <div className="mt-1 text-xs text-muted-foreground">{m.notes}</div>}
              </div>
              <button onClick={()=>onDelete(m.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete meeting">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
