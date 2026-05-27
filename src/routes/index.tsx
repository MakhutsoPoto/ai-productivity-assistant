import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Sparkles, Mail, FileText, ListChecks, Search, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: Landing,
});

const features = [
  { icon: Mail, title: "Smart Email Generator", desc: "Tone- and audience-aware drafts in seconds." },
  { icon: FileText, title: "Meeting Notes Summarizer", desc: "Key points, action items, and deadlines." },
  { icon: ListChecks, title: "AI Task Planner", desc: "Prioritized, schedulable plans for any goal." },
  { icon: Search, title: "Research Assistant", desc: "Concise insights and synthesized summaries." },
  { icon: MessageSquare, title: "Chat with Mothusi", desc: "Your always-on AI workplace partner." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative translucent lilac & mint blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#c9b8ff]/70 blur-3xl" />
        <div className="absolute top-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-[#a8e6c9]/70 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#d9c8ff]/60 blur-3xl" />
        <div className="absolute top-1/2 left-[-6rem] h-72 w-72 rounded-full bg-[#b6e8d2]/60 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-[#cdb8ff]/50 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">M</span>
          Mothusi
        </div>
        <Link to="/auth"><Button className="bg-[#d1d5db] text-white hover:bg-[#c4c8ce]">Sign in</Button></Link>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-12 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-accent/40 px-3 py-1 text-xs">
          <Sparkles className="h-3.5 w-3.5" /> AI Workplace Productivity Assistant
        </div>
        <h1 className="font-display text-5xl font-semibold tracking-tight md:text-6xl">
          Automate your workday with <span className="text-muted-foreground">Mothusi</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          Generate emails, summarize meetings, plan tasks and research topics — all in one calm, professional workspace.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth"><Button size="lg" className="bg-[#d1d5db] text-white hover:bg-[#c4c8ce]">Get started free</Button></Link>
          <a href="#features"><Button size="lg" className="bg-[#d1d5db] text-white hover:bg-[#c4c8ce]">See features</Button></a>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 transition hover:shadow-sm">
              <f.icon className="h-5 w-5 text-muted-foreground" />
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          AI-generated content may require human review.
        </p>
      </section>
    </div>
  );
}
