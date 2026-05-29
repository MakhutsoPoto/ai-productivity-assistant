import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: AuthPage,
});

const btnGrey = "bg-[#4b5563] text-white hover:bg-[#374151]";

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/app", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const notConfirmed = /confirm/i.test(error.message) || /not confirmed/i.test(error.message);
      if (notConfirmed) {
        toast.error("Email not confirmed yet.", {
          action: {
            label: "Resend link",
            onClick: async () => {
              const { error: rErr } = await supabase.auth.resend({ type: "signup", email });
              if (rErr) toast.error(rErr.message);
              else toast.success("Confirmation email resent.");
            },
          },
        });
      } else {
        toast.error(error.message);
      }
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth`, data: { display_name: name } },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email to confirm your account.");
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Google sign-in failed");
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password reset link sent. Check your inbox.");
      setForgotOpen(false);
      setForgotEmail("");
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      {/* Decorative translucent lilac & mint blobs (same as landing) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#c9b8ff]/70 blur-3xl" />
        <div className="absolute top-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-[#a8e6c9]/70 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#d9c8ff]/60 blur-3xl" />
        <div className="absolute top-1/2 left-[-6rem] h-72 w-72 rounded-full bg-[#b6e8d2]/60 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-[#cdb8ff]/50 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card/90 p-8 shadow-sm backdrop-blur">
        <div className="mb-6 flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">M</span>
          Mothusi
        </div>
        <h1 className="font-display text-2xl font-semibold">Welcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace.</p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={signIn} className="mt-4 space-y-3">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
              <div className="flex justify-end">
                <button type="button" onClick={()=>{ setForgotEmail(email); setForgotOpen(true); }} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                  Forgot password?
                </button>
              </div>
              <Button type="submit" className={`w-full ${btnGrey}`} disabled={loading}>{loading?"Signing in…":"Sign in"}</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signUp} className="mt-4 space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
              <Button type="submit" className={`w-full ${btnGrey}`} disabled={loading}>{loading?"Creating…":"Create account"}</Button>
              <p className="text-xs text-muted-foreground">We'll email you a confirmation link to verify it's really you.</p>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-5 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <Button className={`w-full ${btnGrey}`} onClick={google}>Continue with Google</Button>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your email and we'll send you a secure link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={sendReset} className="space-y-3">
            <div><Label>Email</Label><Input type="email" required value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} /></div>
            <DialogFooter>
              <Button type="submit" className={btnGrey} disabled={forgotLoading}>
                {forgotLoading ? "Sending…" : "Send reset link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
