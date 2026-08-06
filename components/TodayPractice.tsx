"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type QuizWord = {
  id: number;
  word: string;
  bangla_meaning: string;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TodayPractice({ userId }: { userId: string | null }) {
  const [pool, setPool] = useState<QuizWord[]>([]);
  const [order, setOrder] = useState<QuizWord[]>([]);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<QuizWord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadPool() {
    setLoading(true);
    const today = todayStr();

    const { data: dailyRows } = await supabase
      .from("user_daily_words")
      .select("word_id")
      .eq("user_id", userId)
      .eq("shown_date", today);

    const ids = (dailyRows ?? []).map((r: any) => r.word_id);

    if (ids.length === 0) {
      setPool([]);
      setLoading(false);
      return;
    }

    const { data: wordRows } = await supabase
      .from("words")
      .select("id, word, bangla_meaning")
      .in("id", ids);

    const list = (wordRows as QuizWord[]) ?? [];
    setPool(list);
    setOrder(shuffle(list));
    setIndex(0);
    setLoading(false);
  }

  useEffect(() => {
    if (order.length === 0) return;
    buildOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, index]);

  function buildOptions() {
    const current = order[index % order.length];
    if (!current) return;

    const wrongPool = pool.filter((w) => w.id !== current.id);
    const wrongChoices = shuffle(wrongPool).slice(0, 3);
    setOptions(shuffle([current, ...wrongChoices]));
    setSelected(null);
  }

  function handleSelect(choice: QuizWord) {
    if (selected) return; // একবার সিলেক্ট করলে আর বদলানো যাবে না
    setSelected(choice.bangla_meaning);

    setTimeout(() => {
      setIndex((prev) => prev + 1);
    }, 2000);
  }

  if (loading) return null;

  if (pool.length === 0) {
    return (
      <section className="bg-white rounded-card p-5 shadow-sm mb-5">
        <h2 className="font-bold mb-1">আজকের প্র্যাকটিস</h2>
        <p className="text-muted text-sm">
          আজ এখনো কোনো নতুন শব্দ শেখা হয়নি — "শব্দ" ট্যাবে গিয়ে শুরু করুন।
        </p>
      </section>
    );
  }

  const current = order[index % order.length];
  if (!current) return null;

  return (
    <section className="bg-white rounded-card p-5 shadow-sm mb-5">
      <h2 className="font-bold mb-3">আজকের প্র্যাকটিস</h2>
      <p className="text-muted text-sm mb-2">নিচের শব্দটির বাংলা অর্থ কি?</p>
      <div className="border border-gray-200 rounded-xl py-4 text-center font-bold text-lg mb-4">
        {current.word}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isThisCorrect = opt.bangla_meaning === current.bangla_meaning;
          const isSelected = selected === opt.bangla_meaning;

          let style = "border-gray-200 bg-surface";
          if (selected) {
            if (isThisCorrect) style = "border-brand bg-brand/10 text-brand";
            else if (isSelected) style = "border-red-400 bg-red-50 text-red-500";
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              disabled={!!selected}
              className={`border rounded-xl py-3 px-2 text-sm font-medium ${style}`}
            >
              {opt.bangla_meaning}
            </button>
          );
        })}
      </div>
    </section>
  );
}
