import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Pause, Square } from "lucide-react";

// Strips markdown so the speech synthesizer reads the substance, not symbols.
function stripMd(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ListenButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle"|"playing"|"paused">("idle");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); };
  }, []);

  if (!supported) return null;

  const play = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(stripMd(text));
    u.rate = 1; u.pitch = 1;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setState("playing");
  };
  const pauseResume = () => {
    if (state === "playing") { window.speechSynthesis.pause(); setState("paused"); }
    else if (state === "paused") { window.speechSynthesis.resume(); setState("playing"); }
  };
  const stop = () => { window.speechSynthesis.cancel(); setState("idle"); };

  return (
    <div className="flex flex-wrap gap-2">
      {state === "idle" ? (
        <Button variant="outline" size="sm" onClick={play}><Volume2 className="h-3.5 w-3.5" /> Listen</Button>
      ) : (
        <>
          <Button variant="outline" size="sm" onClick={pauseResume}>
            <Pause className="h-3.5 w-3.5" /> {state === "playing" ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" size="sm" onClick={stop}>
            <Square className="h-3.5 w-3.5" /> Stop
          </Button>
        </>
      )}
    </div>
  );
}
