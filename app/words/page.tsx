"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";
import WordCard from "@/components/WordCard";

type Word = {
  id: number;
  word: string;
  pos: string | null;
  phonetic_bangla: string | null;
  bangla_meaning: string;
  example_en: string | null;
  example_bn: string | null;
};

type Tab = "new" | "learned" | "bookmarked";

const LEVEL_MAP: Record<string, string> = {
  level1: "A1",
  level2: "A2",
  level3: "B1",
  level4: "B2",
};

const PAGE_SIZE = 10;

export default function WordsPage() {
  const [tab, setTab] = useState<Tab>("new");
  const [userId, setUserId] = useState<string | null>(null);
  const [cefrLevel, setCefrLevel] = useState<string>("A1");
  const [words, setWords] = useState<Word[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  // ইউজার লোড করা
  useEffect(() => {
    async function initUser() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      const { data: user } = await supabase
        .from("users")
        .select("id, current_level")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (user) {
        setUserId(user.id);
        setCefrLevel(LEVEL_MAP[user.current_level] ?? "A1");
      } else {
        setLoading(false);
      }
    }
    initUser();
  }, []);

  // ট্যাব বা ইউজার বদলালে শব্দ লোড করা
  useEffect(() => {
    if (!userId) return;
    loadTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab]);

  async function loadTab() {
  if (!userId) return;
  setLoading(true);

  try {
    const { data: bookmarkRows } = await supabase
      .from("user_word_progress")
      .select("word_id")
      .eq("user_id", userId)
      .eq("is_bookmarked", true);

    setBookmarks(new Set((bookmarkRows ?? []).map((r: any) => r.word_id)));

    if (tab === "new") {
      const { data: learnedRows } = await supabase
        .from("user_word_progress")
        .select("word_id")
        .eq("user_id", userId)
        .eq("status", "learned");

      const learnedIds = (learnedRows ?? []).map((r: any) => r.word_id);

      let query = supabase
        .from("words")
        .select("*")
        .eq("level", cefrLevel)
        .order("order_index", { ascending: true })
        .limit(PAGE_SIZE);

      if (learnedIds.length > 0) {
        query = query.not("id", "in", `(${learnedIds.join(",")})`);
      }

      const { data } = await query;
      setWords((data as Word[]) ?? []);

    } else {
      const fieldToFilter = tab === "learned" ? "status" : "is_bookmarked";
      const filterValue = tab === "learned" ? "learned" : true;

      const { data: rows } = await supabase
        .from("user_word_progress")
        .select("word_id")
        .eq("user_id", userId)
        .eq(fieldToFilter, filterValue);

      const ids = (rows ?? []).map((r: any) => r.word_id);

      if (ids.length === 0) {
        setWords([]);
      } else {
        const { data: wordRows } = await supabase
          .from("words")
          .select("*")
          .in("id", ids)
          .order("order_index", { ascending: true });

        setWords((wordRows as Word[]) ?? []);
      }
    }
  } catch (error) {
    console.error("Error loading tab:", error);
  } finally {
    setLoading(false);
  }
  }
  async function handleNext() {
    if (!userId || words.length === 0) return;
    setAdvancing(true);

    // বর্তমান ১০টা শব্দ learned হিসেবে মার্ক করা
    for (const w of words) {
      await supabase.from("user_word_progress").upsert(
        {
          user_id: userId,
          word_id: w.id,
          status: "learned",
          is_bookmarked: bookmarks.has(w.id),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,word_id" }
      );
    }

    await loadTab();
    setAdvancing(false);
  }

  async function toggleBookmark(wordId: number) {
    if (!userId) return;
    const isCurrentlyBookmarked = bookmarks.has(wordId);

    setBookmarks((prev) => {
      const next = new Set(prev);
      if (isCurrentlyBookmarked) next.delete(wordId);
      else next.add(wordId);
      return next;
    });

    const { data: existing } = await supabase
      .from("user_word_progress")
      .select("status")
      .eq("user_id", userId)
      .eq("word_id", wordId)
      .maybeSingle();

    await supabase.from("user_word_progress").upsert(
      {
        user_id: userId,
        word_id: wordId,
        status: existing?.status ?? "new",
        is_bookmarked: !isCurrentlyBookmarked,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,word_id" }
    );

    if (tab === "bookmarked") loadTab();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "new", label: "নতুন শব্দ" },
    { key: "learned", label: "শেখা শব্দগুলো" },
    { key: "bookmarked", label: "বুকমার্ক" },
  ];

  return (
    <main className="pt-8">
      <div className="px-5 mb-3">
        <h1 className="text-xl font-bold mb-3">শব্দ</h1>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm px-3 py-1.5 rounded-full font-semibold ${
                tab === t.key
                  ? "bg-brand text-white"
                  : "bg-white text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-4">
        {loading && <p className="text-muted">লোড হচ্ছে...</p>}

        {!loading &&
          words.map((w) => (
            <WordCard
              key={w.id}
              word={w.word}
              pos={w.pos}
              phoneticBangla={w.phonetic_bangla}
              banglaMeaning={w.bangla_meaning}
              exampleEn={w.example_en}
              exampleBn={w.example_bn}
              isBookmarked={bookmarks.has(w.id)}
              onToggleBookmark={() => toggleBookmark(w.id)}
            />
          ))}

        {!loading && words.length === 0 && (
          <p className="text-muted text-center mt-10">
            {tab === "new"
              ? "এই লেভেলের সব শব্দ শেখা হয়ে গেছে!"
              : "এখানে এখনো কিছু নেই।"}
          </p>
        )}

        {tab === "new" && !loading && words.length > 0 && (
          <button
            onClick={handleNext}
            disabled={advancing}
            className="bg-brand text-white font-semibold rounded-card py-3 mt-2 mb-20"
          >
            {advancing ? "..." : "পরবর্তী ➜"}
          </button>
        )}
      </div>
    </main>
  );
}
