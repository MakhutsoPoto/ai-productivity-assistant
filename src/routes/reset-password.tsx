import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

const btnGrey = "bg-[#4b5563] text-white hover:bg-[#374151]";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Supabase parses the recovery token from the URL hash on load and emits
  // a PASSWORD_RECOVERY event. Wait for an authenticated recovery session
  // before allowing the password update.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      // Supabase rejects reusing the current password with a clear message.
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#c9b8ff]/70 blur-3xl" />
        <div className="absolute top-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-[#a8e6c9]/70 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#d9c8ff]/60 blur-3xl" />
        <div className="absolute top-1/2 left-[-6rem] h-72 w-72 rounded-full bg-[#b6e8d2]/60 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-[#cdb8ff]/50 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card/90 p-8 shadow-sm backdrop-blur">
        <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a new password. It must be different from your current one.
        </p>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Verifying your reset link… If this takes more than a few seconds, the link may have expired. Request a new one from the sign-in page.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <Label>New password</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Confirm password</Label>
              <Input type="password" required minLength={6} value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className={`w-full ${btnGrey}`} disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
