import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGatewayModel } from "./ai-gateway.server";

const DISCLAIMER = "AI-generated content may require human review.";

// ----- Email generator -----
const EmailInput = z.object({
  topic: z.string().min(3).max(2000),
  tone: z.enum(["formal", "friendly", "persuasive", "concise", "apologetic", "enthusiastic"]),
  audience: z.string().min(2).max(200),
  context: z.string().max(2000).optional(),
});

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EmailInput.parse(d))
  .handler(async ({ data, context }) => {
    const model = getGatewayModel();
    const sys = `You are Mothusi, a professional workplace writing assistant.
Write production-ready emails. Always output STRICT JSON: {"subject":"...","body":"..."}
- Subject: <= 70 chars, specific, no clickbait.
- Body: clear greeting, 1-3 short paragraphs, polite sign-off.
- Match the requested tone exactly. Tailor vocabulary to the audience.
- No placeholders like [Your Name] unless explicitly asked.`;
    const prompt = `Tone: ${data.tone}
Audience: ${data.audience}
Topic / goal: ${data.topic}
${data.context ? `Extra context: ${data.context}` : ""}

Return JSON only.`;
    const { text } = await generateText({ model, system: sys, prompt });
    const parsed = safeJson(text);
    const subject = String(parsed?.subject ?? "Draft email");
    const body = String(parsed?.body ?? text);

    const { data: saved } = await context.supabase
      .from("generated_emails")
      .insert({
        user_id: context.userId,
        subject, body, tone: data.tone, audience: data.audience, prompt: data.topic,
      })
      .select("id").single();

    return { id: saved?.id, subject, body, disclaimer: DISCLAIMER };
  });

// ----- Meeting notes summarizer -----
const NotesInput = z.object({
  title: z.string().max(200).optional(),
  notes: z.string().min(20).max(20000),
});

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NotesInput.parse(d))
  .handler(async ({ data, context }) => {
    const model = getGatewayModel();
    const sys = `You are Mothusi, an expert meeting summarizer.
Produce a clean Markdown summary with these sections, in order:
## Summary
A 2-3 sentence overview.
## Key Points
- Bullet list of decisions and topics.
## Action Items
- [Owner if known] Action — Deadline (if mentioned)
## Deadlines
- Date — Item (only if explicit)
Be precise. Do not invent owners or dates. Skip a section if nothing fits.`;
    const { text } = await generateText({ model, system: sys, prompt: data.notes });

    const { data: saved } = await context.supabase
      .from("meeting_summaries")
      .insert({
        user_id: context.userId,
        title: data.title || "Untitled meeting",
        raw_notes: data.notes,
        summary: text,
      }).select("id").single();
    return { id: saved?.id, summary: text, disclaimer: DISCLAIMER };
  });

// ----- Task planner -----
const PlannerInput = z.object({
  goal: z.string().min(3).max(2000),
  horizonDays: z.number().int().min(1).max(60).default(7),
});
type PlannedTask = { title: string; description?: string; priority: "low"|"medium"|"high"|"urgent"; estimated_minutes?: number; day_offset?: number };

export const planTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PlannerInput.parse(d))
  .handler(async ({ data, context }) => {
    const model = getGatewayModel();
    const sys = `You are Mothusi, a task planning assistant.
Given a goal, produce a JSON array of 3-8 prioritized, scheduled tasks.
Each task: {"title": string (<=80), "description": string (1-2 sentences), "priority": "low"|"medium"|"high"|"urgent", "estimated_minutes": integer 15-240, "day_offset": integer 0..N}.
Order tasks by day_offset then priority. Output ONLY a JSON array.`;
    const { text } = await generateText({
      model, system: sys,
      prompt: `Goal: ${data.goal}\nPlanning horizon: ${data.horizonDays} days.\nReturn JSON array.`,
    });
    const arr = safeJson(text);
    const list: PlannedTask[] = Array.isArray(arr) ? arr : [];

    const today = new Date();
    const rows = list.slice(0, 12).map((t) => {
      const offset = Math.max(0, Math.min(data.horizonDays, Number(t.day_offset ?? 0)));
      const d = new Date(today); d.setDate(today.getDate() + offset);
      return {
        user_id: context.userId,
        title: String(t.title).slice(0, 200),
        description: t.description ?? null,
        priority: (["low","medium","high","urgent"].includes(t.priority) ? t.priority : "medium") as PlannedTask["priority"],
        estimated_minutes: typeof t.estimated_minutes === "number" ? t.estimated_minutes : null,
        scheduled_for: d.toISOString().slice(0, 10),
      };
    });
    if (rows.length) await context.supabase.from("tasks").insert(rows);
    return { count: rows.length, disclaimer: DISCLAIMER };
  });

// ----- Research assistant -----
const ResearchInput = z.object({
  topic: z.string().min(3).max(500),
  focus: z.string().max(500).optional(),
});

export const researchTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResearchInput.parse(d))
  .handler(async ({ data, context }) => {
    const model = getGatewayModel();
    const sys = `You are Mothusi, a careful research assistant.
Produce a structured Markdown briefing:
## Overview
2-3 sentence neutral overview.
## Key Insights
- 5-7 specific, non-obvious insights.
## Considerations & Risks
- Important caveats.
## Suggested Next Steps
- 3-5 concrete actions.
If you are uncertain, say so. Do not fabricate citations or statistics.`;
    const { text } = await generateText({
      model, system: sys,
      prompt: `Topic: ${data.topic}\n${data.focus ? `Focus: ${data.focus}` : ""}`,
    });

    const { data: saved } = await context.supabase.from("research_notes").insert({
      user_id: context.userId, topic: data.topic, summary: text, insights: data.focus ?? null,
    }).select("id").single();
    return { id: saved?.id, summary: text, disclaimer: DISCLAIMER };
  });

// ----- Chatbot (Mothusi) -----
const ChatInput = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(8000),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: thread } = await supabase
      .from("chat_threads").select("id,title,user_id").eq("id", data.threadId).single();
    if (!thread || thread.user_id !== userId) throw new Error("Thread not found");

    const { data: history } = await supabase
      .from("chat_messages").select("role,content")
      .eq("thread_id", data.threadId).order("created_at", { ascending: true }).limit(50);

    await supabase.from("chat_messages").insert({
      thread_id: data.threadId, user_id: userId, role: "user", content: data.message,
    });

    const model = getGatewayModel();
    const sys = `You are Mothusi, a professional AI workplace productivity assistant.
You help with emails, meeting notes, task planning, and research.
Be concise, structured, and warm. Use Markdown. Always remind the user when significant decisions or sensitive content may need human review.`;
    const messages = [
      ...(history ?? []).map((m) => ({ role: m.role as "user"|"assistant", content: m.content })),
      { role: "user" as const, content: data.message },
    ];
    const { text } = await generateText({ model, system: sys, messages });

    await supabase.from("chat_messages").insert({
      thread_id: data.threadId, user_id: userId, role: "assistant", content: text,
    });

    // Auto-title brand new threads
    if (thread.title === "New chat") {
      const title = data.message.slice(0, 60).replace(/\s+/g, " ").trim();
      await supabase.from("chat_threads").update({ title, updated_at: new Date().toISOString() }).eq("id", data.threadId);
    } else {
      await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", data.threadId);
    }
    return { reply: text, disclaimer: DISCLAIMER };
  });

function safeJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  const start = text.indexOf("{"); const startA = text.indexOf("[");
  const s = (startA !== -1 && (startA < start || start === -1)) ? startA : start;
  const e = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (s !== -1 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch {} }
  return null;
}
