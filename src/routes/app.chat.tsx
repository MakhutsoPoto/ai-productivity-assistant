import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/chat")({ component: ChatIndex });

function ChatIndex() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data: existing } = await supabase
        .from("chat_threads").select("id").order("updated_at", { ascending: false }).limit(1);
      if (existing && existing.length) {
        navigate({ to: "/app/chat/$threadId", params: { threadId: existing[0].id }, replace: true });
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: created } = await supabase.from("chat_threads")
        .insert({ user_id: auth.user.id }).select("id").single();
      if (created) navigate({ to: "/app/chat/$threadId", params: { threadId: created.id }, replace: true });
    })();
  }, [navigate]);
  return <div className="text-sm text-muted-foreground">Opening chat…</div>;
}
