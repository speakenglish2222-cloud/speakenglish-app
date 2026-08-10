"use client";

import { useEffect, useState } from "react";
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

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;
  const patternId = params.patternId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Practice States
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [showRecallAnswer, setShowRecallAnswer] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [playingText, setPlayingText] = useState<string | null>(null);

  // New Typing Mode State
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState("");

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function initUser() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (user) setUserId(user.id);
    }
    initUser();
  }, []);

  useEffect(() => {
    async function loadQuestions() {
      setLoading(true);
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

          // Type 2: Fill in the Blanks
          const words = s.sentence_en.split(" ");
          const shuffled = [...words].sort(() => Math.random() - 0.5);
          generatedQuestions.push({
            id: s.id,
            type: "fill",
            prompt_bn: s.sentence_bn,
            correct_en: s.sentence_en,
            words: shuffled,
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

        const shuffledQuestions = generatedQuestions.sort(() => Math.random() - 0.5);
        setQuestions(shuffledQuestions);
      }
      setLoading(false);
    }

    if (patternId) loadQuestions();
  }, [patternId]);

  const current = questions[currentIndex];

  useEffect(() => {
    if (current && current.type === "fill") {
      setAvailableWords(current.words);
      setSelectedWords([]);
    }
    setHeard("");
    setShowRecallAnswer(false);
    setResult(null);
    setIsTyping(false);
    setTypedText("");
  }, [currentIndex, current]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    setPlayingText(text);
    utterance.onend = () => setPlayingText(null);
    utterance.onerror = () => setPlayingText(null);
    window.speechSynthesis.speak(utterance);
  }

  function normalize(text: string) {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\bi am\b/g, "i'm")
      .replace(/\byou are\b/g, "you're")
      .replace(/\bhe is\b/g, "he's")
      .replace(/\bshe is\b/g, "she's")
      .replace(/\bit is\b/g, "it's")
      .replace(/\bwe are\b/g, "we're")
      .replace(/\bthey are\b/g, "they're")
      .replace(/\bcannot\b/g, "can't")
      .replace(/\bdo not\b/g, "don't")
      .replace(/\bdoes not\b/g, "doesn't")
      .replace(/\bdid not\b/g, "didn't")
      .replace(/\bwill not\b/g, "won't")
      .replace(/\bwould not\b/g, "wouldn't")
      .replace(/\bhave not\b/g, "haven't")
      .replace(/\bhas not\b/g, "hasn't");
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। টাইপ করে চেষ্টা করুন।");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    setListening(true);
    setHeard("");

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setHeard(transcript);
      setListening(false);
      checkAnswer(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typedText.trim() || !current) return;

    setHeard(typedText);
    checkAnswer(typedText);
    setTypedText("");
  }

  function checkAnswer(inputVal?: string) {
    if (!current) return;

    let isCorrect = false;

    if (current.type === "pronunciation" || current.type === "recall") {
      const userText = inputVal || heard;
      isCorrect = normalize(userText) === normalize(current.correct_en);
    } else if (current.type === "fill") {
      const constructedSentence = selectedWords.join(" ");
      isCorrect = normalize(constructedSentence) === normalize(current.correct_en);
    }

    if (!isCorrect) {
      // ভুল হলে প্রশ্নটি আবার তালিকার শেষে যুক্ত হবে
      setQuestions((prev) => [...prev, current]);
    }

    setResult(isCorrect ? "correct" : "wrong");
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      router.push(`/sentences/${categoryId}/${patternId}`);
    }
  }

  function handleWordClick(word: string, index: number) {
    setSelectedWords((prev) => [...prev, word]);
    setAvailableWords((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSelectedWordClick(word: string, index: number) {
    setAvailableWords((prev) => [...prev, word]);
    setSelectedWords((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <p className="text-slate-400 font-bold">অনুশীলন লোড হচ্ছে...</p>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-5">
        <p className="text-slate-500 font-bold mb-4">কোনো অনুশীলনী পাওয়া যায়নি!</p>
        <button
          onClick={() => router.back()}
          className="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-2xl shadow-md"
        >
          ফিরে যাও
        </button>
      </main>
    );
  }

  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <main className="min-h-screen bg-slate-50 p-5 pb-28">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm active:scale-95 transition-all"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-500">
              অনুশীলন ({currentIndex + 1}/{questions.length})
            </span>
            <span className="text-xs font-extrabold text-orange-600">{progress}%</span>
          </div>
          <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Instruction */}
      <h2 className="text-lg font-extrabold text-slate-800 mb-4">
        {current.type === "pronunciation" && "বাক্যটি শুদ্ধভাবে উচ্চারণ করো"}
        {current.type === "fill" && "শব্দগুলো সঠিকভাবে সাজাও"}
        {current.type === "recall" && "বাংলা দেখে মনে করে বলো"}
      </h2>

      {/* TYPE 1: PRONUNCIATION */}
      {current.type === "pronunciation" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-500/20 flex items-center justify-between gap-4">
            <p className="font-extrabold text-xl leading-snug">{current.correct_en}</p>
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

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm text-center">
            {/* Toggle Mode Buttons */}
            <div className="flex justify-center gap-2 mb-6">
              <button
                onClick={() => setIsTyping(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  !isTyping
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🎤 ভয়েস দিয়ে বলো
              </button>
              <button
                onClick={() => setIsTyping(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isTyping
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                ⌨️ টাইপ করে লেখো
              </button>
            </div>

            {!isTyping ? (
              /* Voice Input Section */
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
              /* Typing Input Section */
              <form onSubmit={handleTextSubmit} className="space-y-3">
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="এখানে ইংরেজি বাক্যটি টাইপ করো..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={!typedText.trim()}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all active:scale-95 text-sm shadow-md shadow-orange-500/20"
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

      {/* TYPE 2: FILL IN THE BLANKS */}
      {current.type === "fill" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <p className="text-lg font-bold text-slate-800 text-center mb-6">
              "{current.prompt_bn}"
            </p>

            {/* Answer Display Box */}
            <div className="min-h-[60px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-3 flex flex-wrap gap-2 items-center justify-center mb-6">
              {selectedWords.map((word, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectedWordClick(word, idx)}
                  className="bg-orange-500 text-white text-sm font-bold px-3 py-1.5 rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {word}
                </button>
              ))}
            </div>

            {/* Word Bank */}
            <div className="flex flex-wrap gap-2 justify-center">
              {availableWords.map((word, idx) => (
                <button
                  key={idx}
                  onClick={() => handleWordClick(word, idx)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold px-3.5 py-2 rounded-xl border border-slate-200/80 active:scale-95 transition-all"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => checkAnswer()}
            disabled={selectedWords.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 active:scale-98 transition-all"
          >
            উত্তর চেক করো
          </button>
        </div>
      )}

      {/* TYPE 3: RECALL */}
      {current.type === "recall" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm text-center">
            <p className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 inline-block mb-3">
              বাংলা অর্থ
            </p>
            <p className="text-2xl font-extrabold text-slate-800 mb-6 leading-relaxed">
              "{current.prompt_bn}"
            </p>

            {showRecallAnswer ? (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl mb-4">
                <p className="text-xs text-orange-600 font-bold mb-1">সঠিক বাক্য:</p>
                <p className="text-lg font-extrabold text-orange-900">{current.correct_en}</p>
              </div>
            ) : (
              <button
                onClick={() => setShowRecallAnswer(true)}
                className="text-xs font-bold text-slate-500 hover:text-orange-600 underline mb-6 block mx-auto"
              >
                ইংরেজি উত্তরটি দেখো
              </button>
            )}

            {/* Toggle Mode Buttons */}
            <div className="flex justify-center gap-2 mb-6">
              <button
                onClick={() => setIsTyping(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  !isTyping
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🎤 ভয়েস দিয়ে বলো
              </button>
              <button
                onClick={() => setIsTyping(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isTyping
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                ⌨️ টাইপ করে লেখো
              </button>
            </div>

            {!isTyping ? (
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
              <form onSubmit={handleTextSubmit} className="space-y-3">
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="এখানে ইংরেজি বাক্যটি টাইপ করো..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={!typedText.trim()}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all active:scale-95 text-sm shadow-md shadow-orange-500/20"
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

      {/* Result Bottom Sheet Modal */}
      {result && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end justify-center z-50 p-4">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl transition-all ${
              result === "correct" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{result === "correct" ? "🎉" : "😅"}</span>
              <div>
                <h3 className="font-extrabold text-xl">
                  {result === "correct" ? "অসাধারণ! সঠিক হয়েছে" : "একটু ভুল হয়েছে!"}
                </h3>
                {result === "wrong" && (
                  <p className="text-xs text-rose-100 mt-0.5">
                    সঠিক উত্তরটি আবার সামনে আসবে।
                  </p>
                )}
              </div>
            </div>

            {result === "wrong" && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 mb-4 border border-white/10">
                <p className="text-xs font-medium text-rose-100">সঠিক উত্তর ছিল:</p>
                <p className="font-bold text-sm mt-0.5">{current.correct_en}</p>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full bg-white text-slate-900 font-extrabold py-3.5 rounded-2xl shadow-lg active:scale-98 transition-all"
            >
              পরবর্তী ➔
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
