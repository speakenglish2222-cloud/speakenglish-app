"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";
import { logActivityAndUpdateStreak } from "@/lib/activity";

type Question = {
  id: number;
  type: "pronunciation" | "recall" | "fill_blank";
  prompt_bn: string;
  correct_en: string;
  word_bank: string[] | null;
};

// 🛠️ স্মার্ট নরম্যালাইজেশন (I'm এবং I am এর মতো কন্ট্রাকশন হ্যান্ডেল করার জন্য)
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\bi'm\b/g, "i am")
    .replace(/\bhe's\b/g, "he is")
    .replace(/\bshe's\b/g, "she is")
    .replace(/\bit's\b/g, "it is")
    .replace(/\bthey're\b/g, "they are")
    .replace(/\bwe're\b/g, "we are")
    .replace(/\byou're\b/g, "you are")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bdoesn't\b/g, "does not")
    .replace(/\bdidn't\b/g, "did not")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bwon't\b/g, "will not")
    .replace(/[.,!?']/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = Number(params.categoryId);
  const patternId = Number(params.patternId);

  const [userId, setUserId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  const [sttSupported, setSttSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [showReveal, setShowReveal] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const recognitionRef = useRef<any>(null);

  // ⌨️ টাইপিং মোডের স্টেটসমূহ (ডিফল্ট ভয়েস মোড)
  const [inputMode, setInputMode] = useState<"voice" | "type">("voice");
  const [typedText, setTypedText] = useState("");

  const [bankWords, setBankWords] = useState<string[]>([]);
  const [answerWords, setAnswerWords] = useState<string[]>([]);
  const [playingText, setPlayingText] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (user) setUserId(user.id);

      const { data: qRows } = await supabase
        .from("practice_questions")
        .select("*")
        .eq("pattern_id", patternId)
        .order("order_index", { ascending: true });

      setQuestions((qRows as Question[]) ?? []);
      setLoading(false);

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      setSttSupported(!!SpeechRecognition);
    }
    init();
  }, [patternId]);

  const current = questions[index];

  useEffect(() => {
    if (!current) return;
    setResult(null);
    setHeard("");
    setShowReveal(false);
    setInputMode("voice");
    setTypedText("");

    if (current.type === "fill_blank") {
      const words = current.word_bank ?? current.correct_en.split(" ");
      setBankWords(shuffle(words));
      setAnswerWords([]);
    }
  }, [index, current]);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setPlayingText(text);
    utterance.onend = () => setPlayingText(null);
    utterance.onerror = () => setPlayingText(null);

    window.speechSynthesis.speak(utterance);
  }

  function checkAnswer(userText: string) {
    if (!current) return;
    setHeard(userText);

    const isCorrect = normalize(userText) === normalize(current.correct_en);

    if (!isCorrect) {
      setQuestions((prev) => [...prev, current]);
    }

    setResult(isCorrect ? "correct" : "wrong");
  }

  function startListening() {
    if (!sttSupported || !current) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      checkAnswer(transcript);
    };
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typedText.trim()) return;
    checkAnswer(typedText);
  }

  function markSelfConfirmed() {
    setResult("correct");
  }

  function tapBankWord(word: string, i: number) {
    setAnswerWords((prev) => [...prev, word]);
    setBankWords((prev) => prev.filter((_, idx) => idx !== i));
  }

  function tapAnswerWord(word: string, i: number) {
    setBankWords((prev) => [...prev, word]);
    setAnswerWords((prev) => prev.filter((_, idx) => idx !== i));
  }

  function checkFillBlank() {
    const constructed = answerWords.join(" ");
    const isCorrect = normalize(constructed) === normalize(current.correct_en);

    if (!isCorrect) {
      setQuestions((prev) => [...prev, current]);
    }

    setResult(isCorrect ? "correct" : "wrong");
  }

  async function handleNextQuestion() {
    if (index + 1 < questions.length) {
      setIndex((prev) => prev + 1);
    } else {
      await completePattern();
    }
  }

  async function completePattern() {
    if (!userId) return;

    await supabase.from("user_pattern_progress").upsert(
      {
        user_id: userId,
        pattern_id: patternId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,pattern_id" }
    );

    const { data: allPatterns } = await supabase
      .from("sentence_patterns")
      .select("id")
      .eq("category_id", categoryId);

    const { data: completedRows } = await supabase
      .from("user_pattern_progress")
      .select("pattern_id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .in("pattern_id", (allPatterns ?? []).map((p: any) => p.id));

    const total = allPatterns?.length ?? 0;
    const completed = completedRows?.length ?? 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const catStatus = completed >= total ? "completed" : "in_progress";

    await supabase.from("user_category_progress").upsert(
      {
        user_id: userId,
        category_id: categoryId,
        status: catStatus,
        progress_percent: percent,
      },
      { onConflict: "user_id,category_id" }
    );

    // ⚡ Activity tracking & Streak Update
    await logActivityAndUpdateStreak(userId);

    setFinished(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 pt-8">
        <div className="max-w-md mx-auto space-y-4">
          <div className="h-10 w-2/3 bg-slate-200/60 rounded-2xl animate-pulse" />
          <div className="h-40 bg-slate-200/60 rounded-3xl animate-pulse" />
          <div className="h-20 bg-slate-200/60 rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center relative overflow-hidden">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/30 text-5xl animate-bounce">
            🏅
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
            অভিনন্দন!
          </h1>
          <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
            তুমি সফলভাবে সব অনুশীলনী সম্পন্ন করেছো।
          </p>
          <button
            onClick={() => router.push(`/sentences/${categoryId}`)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
          >
            <span>ক্যাটাগরিতে ফিরে যাও</span>
            <span className="text-lg">➜</span>
          </button>
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 pt-12 text-center max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <p className="text-slate-600 font-medium">
            এই প্যাটার্নের কোনো প্র্যাকটিস প্রশ্ন নেই।
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl"
          >
            ফিরে যান
          </button>
        </div>
      </main>
    );
  }

  const progressPercent = Math.min(
    100,
    Math.round(((index + 1) / questions.length) * 100)
  );

  return (
    <main className="min-h-screen bg-slate-50 pt-6 pb-28 px-4 max-w-md mx-auto">
      {/* Top Bar with Progress */}
      <div className="flex items-center gap-3.5 mb-4 px-1">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-700 text-lg hover:bg-slate-50 active:scale-95 transition-all flex-shrink-0"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              অনুশীলন ({index + 1}/{questions.length})
            </span>
            <span className="text-xs font-black text-orange-600">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Task Title */}
      <div className="mb-5 px-1">
        <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">
          {current.type === "pronunciation" && "বাক্যটি শুদ্ধভাবে উচ্চারণ করো"}
          {current.type === "recall" && "বাক্যটি ইংরেজিতে বলো"}
          {current.type === "fill_blank" && "সঠিক বাক্যটি সাজাও"}
        </h1>
      </div>

      {/* Type 1: Pronunciation */}
      {current.type === "pronunciation" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-500/20 flex items-center justify-between gap-4">
            <p className="font-extrabold text-xl leading-snug">
              {current.correct_en}
            </p>
            <button
              onClick={() => speak(current.correct_en)}
              className={`w-12 h-12 rounded-2xl backdrop-blur-md flex items-center justify-center text-xl transition-all shadow-md flex-shrink-0 active:scale-90 ${
                playingText === current.correct_en
                  ? "bg-white text-orange-600 animate-pulse"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              🔊
            </button>
          </div>

          <div className="flex bg-slate-200/70 p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setInputMode("voice")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                inputMode === "voice"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <span>🎤</span>
              <span>ভয়েস দিয়ে বলো</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode("type")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                inputMode === "type"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <span>⌨️</span>
              <span>টাইপ করে লেখো</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm text-center">
            {inputMode === "voice" ? (
              sttSupported ? (
                <>
                  <button
                    onClick={startListening}
                    className={`w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white text-4xl flex items-center justify-center mx-auto shadow-xl shadow-orange-500/30 transition-all active:scale-95 ${
                      listening ? "animate-pulse ring-8 ring-orange-200" : ""
                    }`}
                  >
                    🎤
                  </button>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4">
                    {listening ? "শুনছি... এখন বলো" : "মাইকে চাপ দিয়ে বাক্যটি বলো"}
                  </p>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-slate-500 mb-3 font-medium">
                    ভয়েস সাপোর্ট নেই। টাইপ মোড ব্যবহার করো।
                  </p>
                  <button
                    onClick={markSelfConfirmed}
                    className="bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs"
                  >
                    আমি জোরে পড়েছি ✓
                  </button>
                </div>
              )
            ) : (
              <form onSubmit={handleTextSubmit} className="space-y-3">
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="এখানে ইংরেজি বাক্যটি টাইপ করো..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={!typedText.trim()}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-95 text-sm shadow-md shadow-orange-500/20"
                >
                  জমা দাও ➔
                </button>
              </form>
            )}

            {heard && (
              <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                <p className="text-xs font-medium text-slate-400">তুমি বলেছ/লিখেছ:</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">"{heard}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Type 2: Recall */}
      {current.type === "recall" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <span className="text-[10px] font-extrabold text-orange-600 bg-orange-100/80 px-2.5 py-1 rounded-full tracking-wider uppercase mb-2 inline-block">
              বাংলা বাক্য
            </span>
            <p className="font-extrabold text-slate-800 text-xl leading-snug">
              {current.prompt_bn}
            </p>
          </div>

          <div className="flex bg-slate-200/70 p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setInputMode("voice")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                inputMode === "voice"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <span>🎤</span>
              <span>ভয়েস দিয়ে বলো</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode("type")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                inputMode === "type"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <span>⌨️</span>
              <span>টাইপ করে লেখো</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm text-center">
            {inputMode === "voice" ? (
              sttSupported ? (
                <>
                  <button
                    onClick={startListening}
                    className={`w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white text-3xl flex items-center justify-center mx-auto shadow-lg shadow-orange-500/25 transition-all active:scale-95 ${
                      listening ? "animate-pulse ring-8 ring-orange-200" : ""
                    }`}
                  >
                    🎤
                  </button>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">
                    {listening ? "শুনছি... ইংরেজিতে বলো" : "মাইকে চাপ দিয়ে ইংরেজিতে বলো"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 font-medium">
                  ইংরেজিতে বাক্যটি মনে করে জোরে বলো, তারপর উত্তর দেখো।
                </p>
              )
            ) : (
              <form onSubmit={handleTextSubmit} className="space-y-3">
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="এখানে ইংরেজি বাক্যটি টাইপ করো..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={!typedText.trim()}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-95 text-sm shadow-md shadow-orange-500/20"
                >
                  জমা দাও ➔
                </button>
              </form>
            )}

            {heard && (
              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                <p className="text-xs font-medium text-slate-400">তুমি বলেছ/লিখেছ:</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">"{heard}"</p>
              </div>
            )}
          </div>

          {/* 💡 ইংরেজি উত্তর দেখুন এবং শুনুন বাটন যুক্ত করা হলো */}
          {!showReveal ? (
            <button
              onClick={() => setShowReveal(true)}
              className="w-full bg-white border border-slate-200/80 hover:bg-orange-50 text-orange-600 font-bold py-3.5 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>👁️ ইংরেজি উত্তর দেখুন</span>
            </button>
          ) : (
            <div className="bg-orange-50 border border-orange-200/80 rounded-3xl p-5 text-center space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-orange-600 tracking-wider uppercase">
                  সঠিক ইংরেজি বাক্য
                </span>
                <button
                  onClick={() => speak(current.correct_en)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm transition-all ${
                    playingText === current.correct_en
                      ? "bg-orange-500 text-white animate-pulse"
                      : "bg-orange-200 text-orange-800 hover:bg-orange-300"
                  }`}
                >
                  🔊
                </button>
              </div>
              <p className="font-extrabold text-orange-950 text-lg text-left">
                {current.correct_en}
              </p>
              {!result && (
                <button
                  onClick={markSelfConfirmed}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm"
                >
                  বুঝেছি, সামনে বাড়ো ✓
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Type 3: Fill Blank */}
      {current.type === "fill_blank" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
            <span className="text-[10px] font-extrabold text-orange-600 bg-orange-100/80 px-2.5 py-0.5 rounded-full tracking-wider uppercase mb-2 inline-block">
              অর্থ
            </span>
            <p className="font-bold text-slate-800 text-lg leading-snug">
              {current.prompt_bn}
            </p>
          </div>

          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-4 min-h-[90px] flex flex-wrap gap-2 items-center">
            {answerWords.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 w-full text-center">
                নিচ থেকে শব্দ বেছে নিয়ে বাক্য সাজাও
              </p>
            ) : (
              answerWords.map((w, i) => (
                <button
                  key={i}
                  onClick={() => tapAnswerWord(w, i)}
                  className="bg-orange-500 text-white px-3.5 py-2 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>{w}</span>
                  <span className="text-xs opacity-70">✕</span>
                </button>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-center py-2">
            {bankWords.map((w, i) => (
              <button
                key={i}
                onClick={() => tapBankWord(w, i)}
                className="bg-white border border-slate-200 text-slate-700 hover:border-orange-300 hover:text-orange-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all"
              >
                {w}
              </button>
            ))}
          </div>

          {!result && (
            <button
              onClick={checkFillBlank}
              disabled={answerWords.length === 0}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50"
            >
              চেক করো
            </button>
          )}
        </div>
      )}

      {/* Result Card & Next Action Button */}
      {result && (
        <div className="mt-6 space-y-3">
          <div
            className={`rounded-2xl p-4 text-center font-bold border transition-all ${
              result === "correct"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            {result === "correct"
              ? "🎉 দারুণ! সঠিক হয়েছে।"
              : "❌ ভুল হয়েছে! প্রশ্নটি আবার চেষ্টা করার জন্য পেছনে যুক্ত করা হলো।"}
          </div>

          <button
            onClick={handleNextQuestion}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>পরবর্তী প্রশ্ন</span>
            <span>➔</span>
          </button>
        </div>
      )}
    </main>
  );
}
