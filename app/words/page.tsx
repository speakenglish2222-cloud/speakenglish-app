"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

type Word = {
  id: number;
  word: string;
  pos: string | null;
  phonetic_bangla: string | null;
  bangla_meaning: string;
  example_en: string | null;
  example_bn: string | null;
};

type ProgressMap = Record<number, string>;

export default function WordsPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: wordRows } = await supabase
        .from("words")
        .select("*")
        .order("order_index", { ascending: true })
        .limit(20);

      setWords((wordRows as Word[]) ?? []);

      const { data: progressRows } = await supabase
        .from("user_word_progress")
        .select("word_id, status")
        .eq("user_id", user.id);

      const map: ProgressMap = {};
      (progressRows ?? []).forEach((p: any) => {
        map[p.word_id] = p.status;
      });
      setProgress(map);

      setLoading(false);
    }

    load();
  }, []);

  async function toggleBookmark(wordId: number) {
    if (!userId) return;
    const current = progress[wordId];
    const newStatus = current === "bookmarked" ? "new" : "bookmarked";

    setProgress((prev) => ({ ...prev, [wordId]: newStatus }));

    await supabase.from("user_word_progress").upsert(
      {
        user_id: userId,
        word_id: wordId,
        status: newStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,word_id" }
    );
  }

  function speak(text: string) {
    if (typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  if (loading) {
    return (
      <main className="p-5 pt-8">
        <p className="text-muted">লোড হচ্ছে...</p>
      </main>
    );
  }

  return (
    <main className="pt-8">
      <div className="px-5 mb-3">
        <h1 className="text-xl font-bold">শব্দ শেখো</h1>
      </div>

      <div className="px-5 pb-24 flex flex-col gap-4">
        {words.map((w) => {
          const isBookmarked = progress[w.id] === "bookmarked";
          return (
            <div key={w.id} className="bg-white rounded-card p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-lg font-bold text-brand">
                    {w.word}
                  </span>
                  {w.pos && (
                    <span className="text-xs text-muted ml-2">{w.pos}</span>
                  )}
                  <button
                    onClick={() => speak(w.word)}
                    className="block text-sm text-muted mt-1"
                  >
                    🔊 {w.phonetic_bangla}
                  </button>
                </div>
                <button
                  onClick={() => toggleBookmark(w.id)}
                  className="text-xl"
                >
                  {isBookmarked ? "🔖" : "📑"}
                </button>
              </div>

              <p className="font-semibold mt-3">{w.bangla_meaning}</p>

              {w.example_en && (
                <div className="text-sm text-muted mt-2 leading-relaxed">
                  <p className="text-ink">{w.example_en}</p>
                  <p>{w.example_bn}</p>
                </div>
              )}
            </div>
          );
        })}

        {words.length === 0 && (
          <p className="text-muted text-center mt-10">
            এখনো কোনো শব্দ যোগ করা হয়নি।
          </p>
        )}
      </div>
    </main>
  );
}
