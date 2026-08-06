"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";
import WordCard from "@/components/WordCard";

type Example = {
  example_en: string;
  example_bn: string;
};

type Word = {
  id: number;
  word: string;
  pos: string | null;
  phonetic_bangla: string | null;
  bangla_meaning: string;
  examples: Example[];
};

type Tab = "new" | "learned" | "bookmarked";

const LEVEL_MAP: Record<string, string> = {
  level1: "A1",
  level2: "A2",
  level3: "B1",
  level4: "B2",
};

const PAGE_SIZE = 10;
const DAILY_PAGE_LIMIT = 5; // ৫টা পেজ = ৫০টা শব্দ প্রতিদিন

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function WordsPage() {
  const [tab, setTab] = useState<Tab>("new");
  const [userId, setUserId] = useState<string | null>(null);
  const [cefrLevel, setCefrLevel] = useState<string>("A1");
  const [words, setWords] = useState<Word[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const [dailyPagesUsed, setDailyPagesUsed] = useState(0);
  const dailyLimitReached = dailyPagesUsed >= DAILY_PAGE_LIMIT;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Word[]>([]);
  const [searching, setSearching] = useState(false);
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    async function initUser() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      const { data: user } = await supabase
        .from("users")
        .select("id, current_level, daily_word_date, daily_pages_used")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (user) {
        setUserId(user.id);
        setCefrLevel(LEVEL_MAP[user.current_level] ?? "A1");

        const today = todayStr();
        if (user.daily_word_date !== today) {
          await supabase
            .from("users")
            .update({ daily_word_date: today, daily_pages_used: 0 })
            .eq("id", user.id);
          setDailyPagesUsed(0);
        } else {
          setDailyPagesUsed(user.daily_pages_used ?? 0);
        }
      } else {
        setLoading(false);
      }
    }
    initUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab]);

  useEffect(() => {
    if (!userId) return;
    if (!isSearching) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => runSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, userId]);

  async function runSearch(query: string) {
    if (!query) return;
    setSearching(true);
    const { data } = await supabase
      .from("words")
      .select("*")
      .eq("level", cefrLevel)
      .or(`word.ilike.%${query}%,bangla_meaning.ilike.%${query}%`)
      .order("word", { ascending: true })
      .limit(30);
    setSearchResults(await attachExamples((data as any[]) ?? []));
    setSearching(false);
  }

  async function attachExamples(
    wordList: Omit<Word, "examples">[]
  ): Promise<Word[]> {
    if (wordList.length === 0) return [];
    const ids = wordList.map((w) => w.id);
    const { data: exampleRows } = await supabase
      .from("word_examples")
      .select("word_id, example_en, example_bn, order_index")
      .in("word_id", ids)
      .order("order_index", { ascending: true });

    const grouped: Record<number, Example[]> = {};
    (exampleRows ?? []).forEach((r: any) => {
      if (!grouped[r.word_id]) grouped[r.word_id] = [];
      grouped[r.word_id].push({
        example_en: r.example_en,
        example_bn: r.example_bn,
      });
    });

    return wordList.map((w) => ({ ...w, examples: grouped[w.id] ?? [] }));
  }

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
        setWords(await attachExamples((data as any[]) ?? []));
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
          setWords(await attachExamples((wordRows as any[]) ?? []));
        }
      }
    } catch (error) {
      console.error("Error loading tab:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleNext() {
    if (!userId || words.length === 0 || dailyLimitReached) return;
    setAdvancing(true);

    const today = todayStr();

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

    const dailyRows = words.map((w) => ({
      user_id: userId,
      word_id: w.id,
      shown_date: today,
    }));
    await supabase
      .from("user_daily_words")
      .upsert(dailyRows, { onConflict: "user_id,word_id,shown_date" });

    const newCount = dailyPagesUsed + 1;
    await supabase
      .from("users")
      .update({ daily_word_date: today, daily_pages_used: newCount })
      .eq("id", userId);
    setDailyPagesUsed(newCount);

    await loadTab();
    setAdvancing(false);

    // ⚡ কোনো অ্যানিমেশন ছাড়াই পলকে পেজ টপে নিয়ে যাওয়া
    window.scrollTo({ top: 0, behavior: "instant" });
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

    if (tab === "bookmarked" && !isSearching) loadTab();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "new", label: "নতুন শব্দ" },
    { key: "learned", label: "শেখা শব্দগুলো" },
    { key: "bookmarked", label: "বুকমার্ক" },
  ];

  const displayedWords = isSearching ? searchResults : words;

  return (
    <main className="pt-6 pb-20 min-h-screen bg-slate-50">
      {/* Header & Navigation */}
      <div className="px-5 mb-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 pt-2 pb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-2xl font-black text-slate-800 shrink-0">শব্দ</h1>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 শব্দ বা অর্থ খুঁজুন..."
            className="flex-1 min-w-0 bg-white shadow-sm rounded-full px-4 py-2 text-sm border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {!isSearching && (
          <div className="flex gap-2 bg-slate-200/60 p-1 rounded-full">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 text-xs py-2 rounded-full font-bold transition-all duration-300 ${
                  tab === t.key
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {!isSearching && tab === "new" && (
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-xs font-semibold text-slate-500">
              আজকের প্রোগ্রেস:
            </span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              {dailyPagesUsed}/{DAILY_PAGE_LIMIT} পেজ
            </span>
          </div>
        )}
      </div>

      <div className="px-5 flex flex-col gap-4">
        {isSearching && searching && (
          <p className="text-slate-400 text-center py-6">খোঁজা হচ্ছে...</p>
        )}
        {!isSearching && loading && (
          <p className="text-slate-400 text-center py-6">শব্দ লোড হচ্ছে...</p>
        )}

        {!isSearching && tab === "new" && dailyLimitReached && !loading && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6 text-center shadow-sm">
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-extrabold text-emerald-900 text-base mb-1">
              আজকের ৫০টা শব্দ শেখা শেষ!
            </p>
            <p className="text-emerald-700/80 text-xs">
              আগামীকাল আবার নতুন শব্দ শেখা যাবে।
            </p>
          </div>
        )}

        {!(tab === "new" && dailyLimitReached && !isSearching) &&
          displayedWords.map((w) => (
            <WordCard
              key={w.id}
              word={w.word}
              pos={w.pos}
              phoneticBangla={w.phonetic_bangla}
              banglaMeaning={w.bangla_meaning}
              examples={w.examples}
              isBookmarked={bookmarks.has(w.id)}
              onToggleBookmark={() => toggleBookmark(w.id)}
            />
          ))}

        {isSearching && !searching && searchResults.length === 0 && (
          <p className="text-slate-400 text-center py-10">কোনো শব্দ পাওয়া যায়নি।</p>
        )}

        {!isSearching && !loading && !dailyLimitReached && words.length === 0 && (
          <p className="text-slate-400 text-center py-10">
            {tab === "new"
              ? "এই লেভেলের সব শব্দ শেখা হয়ে গেছে!"
              : "এখানে এখনো কিছু নেই।"}
          </p>
        )}

        {!isSearching &&
          tab === "new" &&
          !loading &&
          !dailyLimitReached &&
          words.length > 0 && (
            <button
              onClick={handleNext}
              disabled={advancing}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-green-500 text-white font-extrabold rounded-2xl py-3.5 mt-2 shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {advancing ? "লোড হচ্ছে..." : "পরবর্তী ➔"}
            </button>
          )}
      </div>
    </main>
  );
}
