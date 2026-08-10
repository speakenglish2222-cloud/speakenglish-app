"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

type Question = {
  id: number;
  type: "pronunciation" | "recall" | "fill";
  prompt_bn: string;
  correct_en: string;
  words: string[];
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
  const categoryId = params.categoryId as string;
  const patternId = params.patternId as string;

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

      // 🔄 আগের ডাটাবেস টেবিল 'sentences' ব্যবহার করা হয়েছে
      const { data: sentences } = await supabase
        .from("sentences")
        .select("*")
        .eq("pattern_id", Number(patternId));

      if (sentences && sentences.length > 0) {
        const generatedQuestions: Question[] = [];

        sentences.forEach((s) => {
          // Type 1: Pronunciation
          generatedQuestions.push({
            id: s.id,
            type: "pronunciation",
            prompt_bn: s.sentence_bn,
            correct_en: s.sentence_en,
            words: [],
          });

          // Type 2: Fill
          const words = s.sentence_en.split(" ");
          generatedQuestions.push({
            id: s.id,
            type: "fill",
            prompt_bn: s.sentence_bn,
            correct_en: s.sentence_en,
            words: words,
          });

          // Type 3: Recall
          generatedQuestions.push({
            id: s.id,
            type: "recall",
            prompt_bn: s.sentence_bn,
            correct_en: s.sentence_en,
            words: [],
          });
        });

        setQuestions(shuffle(generatedQuestions));
      }

      setLoading(false);

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      setSttSupported(!!SpeechRecognition);
    }

    if (patternId) init();
  }, [patternId]);

  const current = questions[index];

  useEffect(() => {
    if (!current) return;
    setResult(null);
    setHeard("");
    setShowReveal(false);

    if (current.type === "fill") {
      setBankWords(shuffle(current.words));
      setAnswerWords([]);
    }
  }, [index, current]);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88;

    utterance.onstart = () => setPlayingText(text);
    utterance.onend = () => setPlayingText(null);
    utterance.onerror = () => setPlayingText(null);

    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    if (!sttSupported || !current) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setHeard(transcript);
      const isCorrect = normalize(transcript) === normalize(current.correct_en);

      if (!isCorrect) {
        // 🔄 ভুল হলে প্রশ্নটি শেষে আবার যুক্ত হবে
        setQuestions((prev) => [...prev, current]);
      }

      setResult(isCorrect ? "correct" : "wrong");
    };
    recognition.onerror = () => setListening(false);

    recognition.start();
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

  function checkFill() {
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
      setFinished(true);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <p className="text-slate-500 font-bold">অনুশীলন লোড হচ্ছে...</p>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center">
          <div className="w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
            🏅
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">অভিনন্দন!</h1>
          <p className="text-sm font-medium text-slate-500 mb-6">
            তুমি সফলভাবে সব অনুশীলনী সম্পন্ন করেছো।
          </p>
          <button
            onClick={() => router.push(`/sentences/${categoryId}/${patternId}`)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all"
          >
            ফিরে যাও
          </button>
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 pt-12 text-center max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <p className="text-slate-600 font-medium">কোনো অনুশীলনী পাওয়া যায়নি!</p>
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
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-700 text-lg active:scale-95 transition-all"
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
          {current.type === "recall" && "বাংলা দেখে মনে করে বলো"}
          {current.type === "fill" && "শব্দগুলো সঠিকভাবে সাজাও"}
        </h1>
      </div>

      {/* Type 1: Pronunciation */}
      {current.type === "pronunciation" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl flex items-center justify-between gap-4">
            <p className="font-extrabold text-xl leading-snug">
              {current.correct_en}
            </p>
            <button
              onClick={() => speak(current.correct_en)}
              className={`w-12 h-12 rounded-2xl backdrop-blur-md flex items-center justify-center text-xl transition-all shadow-md active:scale-90 ${
                playingText === current.correct_en
                  ? "bg-white text-orange-600 animate-pulse"
                  : "bg-white/20 text-white"
              }`}
            >
              🔊
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm text-center">
            <button
              onClick={startListening}
              className={`w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white text-4xl flex items-center justify-center mx-auto shadow-xl transition-all active:scale-95 ${
                listening ? "animate-pulse ring-8 ring-orange-200" : ""
              }`}
            >
              🎤
            </button>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4">
              {listening ? "শুনছি... এখন বলো" : "মাইকে চাপ দিয়ে বাক্যটি বলো"}
            </p>
            {heard && (
              <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                <p className="text-xs font-medium text-slate-400">তুমি বলেছ:</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  "{heard}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Type 2: Recall */}
      {current.type === "recall" && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <span className="text-[10px] font-extrabold text-orange-600 bg-orange-100/80 px-2.5 py-1 rounded-full tracking-wider uppercase mb-2 inline-block">
              বাংলা বাক্য
            </span>
            <p className="font-extrabold text-slate-800 text-xl leading-snug">
              {current.prompt_bn}
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm text-center">
            <button
              onClick={startListening}
              className={`w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white text-3xl flex items-center justify-center mx-auto shadow-lg transition-all active:scale-95 ${
                listening ? "animate-pulse ring-8 ring-orange-200" : ""
              }`}
            >
              🎤
            </button>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">
              {listening ? "শুনছি... ইংরেজিতে বলো" : "মাইকে চাপ দিয়ে ইংরেজিতে বলো"}
            </p>
            {heard && (
              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                <p className="text-xs font-medium text-slate-400">তুমি বলেছ:</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  "{heard}"
                </p>
              </div>
            )}
          </div>

          {!showReveal ? (
            <button
              onClick={() => setShowReveal(true)}
              className="w-full bg-white border border-slate-200/80 text-orange-600 font-bold py-3.5 rounded-2xl shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <span>ইংরেজি উত্তরটি দেখো</span>
              <span>👁</span>
            </button>
          ) : (
            <div className="bg-orange-50 border border-orange-200/80 rounded-3xl p-5 text-center space-y-3">
              <span className="text-[10px] font-bold text-orange-600 tracking-wider uppercase">
                সঠিক ইংরেজি
              </span>
              <p className="font-extrabold text-orange-900 text-lg">
                {current.correct_en}
              </p>
              {!result && (
                <button
                  onClick={markSelfConfirmed}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all text-sm"
                >
                  বুঝেছি ✓
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Type 3: Fill */}
      {current.type === "fill" && (
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
                  className="bg-orange-500 text-white px-3.5 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-1.5"
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
                className="bg-white border border-slate-200 text-slate-700 hover:border-orange-300 hover:text-orange-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm"
              >
                {w}
              </button>
            ))}
          </div>

          {!result && (
            <button
              onClick={checkFill}
              disabled={answerWords.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all disabled:opacity-50"
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
            <p className="text-lg">
              {result === "correct" ? "✅ একদম সঠিক!" : "❌ ভুল হয়েছে"}
            </p>
            {result === "wrong" && (
              <p className="text-xs mt-1 font-medium">
                প্রশ্নটি আবার অনুশীলনের শেষে যোগ করা হয়েছে।
              </p>
            )}
          </div>

          <button
            onClick={handleNextQuestion}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
          >
            পরবর্তী ➔
          </button>
        </div>
      )}
    </main>
  );
}
