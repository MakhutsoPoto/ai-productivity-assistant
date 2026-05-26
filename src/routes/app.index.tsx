import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, FileText, ListChecks, Search, MessageSquare, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/")({ component: Overview });

const cards = [
  { url: "/app/email", icon: Mail, title: "Smart Email Generator", desc: "Draft tone-tuned emails in seconds." },
  { url: "/app/notes", icon: FileText, title: "Meeting Notes Summarizer", desc: "Key points, actions, deadlines." },
  { url: "/app/tasks", icon: ListChecks, title: "AI Task Planner", desc: "Plan and prioritize your week." },
  { url: "/app/research", icon: Search, title: "Research Assistant", desc: "Insights and synthesis on any topic." },
  { url: "/app/chat", icon: MessageSquare, title: "Chat with Mothusi", desc: "Conversational AI workspace partner." },
];

function Overview() {
  const stats = useQuery({
    queryKey: ["overview-stats"],
    queryFn: async () => {
      const [emails, summaries, tasks, research] = await Promise.all([
        supabase.from("generated_emails").select("id", { count: "exact", head: true }),
        supabase.from("meeting_summaries").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("research_notes").select("id", { count: "exact", head: true }),
      ]);
      return {
        emails: emails.count ?? 0, summaries: summaries.count ?? 0,
        tasks: tasks.count ?? 0, research: research.count ?? 0,
      };
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your AI workplace — calm, structured, and ready to ship.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Emails drafted" value={stats.data?.emails ?? 0} />
        <Stat label="Meetings summarized" value={stats.data?.summaries ?? 0} />
        <Stat label="Tasks planned" value={stats.data?.tasks ?? 0} />
        <Stat label="Research notes" value={stats.data?.research ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.url} to={c.url} className="group rounded-2xl border bg-card p-6 transition hover:shadow-sm">
            <c.icon className="h-5 w-5 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground/70 group-hover:text-foreground">
              Open <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}
