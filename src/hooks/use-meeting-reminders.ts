import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "mothusi.reminded";

function getReminded(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch { return new Set(); }
}
function saveReminded(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
}

// Polls scheduled_meetings every minute and fires an in-app toast
// 30 minutes before each meeting. Deduped per browser via localStorage.
export function useMeetingReminders() {
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const now = Date.now();
      const horizon = new Date(now + 35 * 60 * 1000).toISOString();
      const past = new Date(now - 60 * 1000).toISOString();

      const { data } = await supabase
        .from("scheduled_meetings")
        .select("id, title, starts_at")
        .gte("starts_at", past)
        .lte("starts_at", horizon);

      if (cancelled || !data) return;
      const reminded = getReminded();
      let changed = false;

      for (const m of data) {
        const startsAt = new Date(m.starts_at).getTime();
        const minutesUntil = Math.round((startsAt - now) / 60000);
        if (minutesUntil <= 30 && minutesUntil >= -1 && !reminded.has(m.id)) {
          toast(`Upcoming meeting: ${m.title}`, {
            description: minutesUntil <= 0
              ? "Starting now."
              : `Starts in ${minutesUntil} minute${minutesUntil === 1 ? "" : "s"}.`,
            duration: 12000,
          });
          reminded.add(m.id);
          changed = true;
        }
      }
      if (changed) saveReminded(reminded);
    };

    check();
    const id = setInterval(check, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
}
