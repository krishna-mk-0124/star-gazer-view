import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { generateQuiz, type QuizQuestion } from "@/lib/quizGenerator";
import { Trophy, RotateCcw, GraduationCap } from "lucide-react";

export function QuizModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [seed, setSeed] = useState(0);
  const quiz: QuizQuestion[] = useMemo(() => generateQuiz(30), [seed]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const total = quiz.length;
  const question = quiz[index];

  const reset = () => {
    setSeed((s) => s + 1);
    setIndex(0);
    setScore(0);
    setPicked(null);
    setFinished(false);
  };

  const handlePick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === question.answer) setScore((s) => s + 1);
    setTimeout(() => {
      if (index + 1 >= total) {
        setFinished(true);
      } else {
        setIndex((n) => n + 1);
        setPicked(null);
      }
    }, 900);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl border-white/10 bg-black/85 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sky-300">
            <GraduationCap className="h-5 w-5" />
            Space Academy Quiz
          </DialogTitle>
        </DialogHeader>

        {!finished ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>
                Question {index + 1} / {total} ·{" "}
                <span className="text-sky-300">{question.category}</span>
              </span>
              <span>Score: {score}</span>
            </div>
            <Progress value={((index + (picked !== null ? 1 : 0)) / total) * 100} className="h-1.5 bg-white/10" />

            <h3 className="text-lg font-medium leading-snug">{question.q}</h3>

            <div className="grid gap-2">
              {question.options.map((opt, i) => {
                let cls = "border-white/15 bg-white/5 hover:bg-white/10 text-white";
                if (picked !== null) {
                  if (i === question.answer) {
                    cls = "border-emerald-400/60 bg-emerald-500/25 text-emerald-50";
                  } else if (i === picked) {
                    cls = "border-rose-400/60 bg-rose-500/25 text-rose-50";
                  } else {
                    cls = "border-white/10 bg-white/5 text-white/40";
                  }
                }
                return (
                  <button
                    key={i}
                    disabled={picked !== null}
                    onClick={() => handlePick(i)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${cls}`}
                  >
                    <span className="mr-2 text-white/40">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2 text-center">
            <Trophy className="mx-auto h-12 w-12 text-amber-300" />
            <div>
              <h3 className="text-2xl font-semibold">Quiz Complete!</h3>
              <p className="mt-1 text-sm text-white/70">
                You scored{" "}
                <span className="font-bold text-emerald-300">
                  {score} / {total}
                </span>
              </p>
              <p className="mt-2 text-xs text-white/50">
                {score / total >= 0.8
                  ? "Stellar performance, astronaut."
                  : score / total >= 0.5
                  ? "Solid orbit — keep training."
                  : "The cosmos awaits. Try again!"}
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={reset} className="gap-2 bg-sky-500/90 hover:bg-sky-500">
                <RotateCcw className="h-4 w-4" /> New random set
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
                className="bg-white/10 text-white hover:bg-white/20"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
