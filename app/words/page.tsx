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
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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
          // নতুন দিন — কাউন্টার রিসেট
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

    // এই ১০টা শব্দ learned মার্ক করা
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

    // আজকের প্র্যাকটিসের জন্য এই শব্দগুলো user_daily_words এ সেভ করা
    const dailyRows = words.map((w) => ({
      user_id: userId,
      word_id: w.id,
      shown_date: today,
    }));
    await supabase
      .from("user_daily_words")
      .upsert(dailyRows, { onConflict: "user_id,word_id,shown_date" });

    // দৈনিক পেজ কাউন্টার বাড়ানো
    const newCount = dailyPagesUsed + 1;
    await supabase
      .from("users")
      .update({ daily_word_date: today, daily_pages_used: newCount })
      .eq("id", userId);
    setDailyPagesUsed(newCount);

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

    if (tab === "bookmarked" && !isSearching) loadTab();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "new", label: "নতুন শব্দ" },
    { key: "learned", label: "শেখা শব্দগুলো" },
    { key: "bookmarked", label: "বুকমার্ক" },
  ];

  const displayedWords = isSearching ? searchResults : words;

  return (
    <main className="pt-8">
      <div className="px-5 mb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-xl font-bold shrink-0">শব্দ</h1>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 শব্দ বা অর্থ খুঁজুন..."
            className="flex-1 min-w-0 bg-white rounded-full px-4 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {!isSearching && (
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`text-sm px-3 py-1.5 rounded-full font-semibold ${
                  tab === t.key ? "bg-brand text-white" : "bg-white text-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {!isSearching && tab === "new" && (
          <p className="text-xs text-muted mt-2">
            আজকে {dailyPagesUsed}/{DAILY_PAGE_LIMIT} পেজ শেষ হয়েছে
          </p>
        )}
      </div>

      <div className="px-5 pb-6 flex flex-col gap-4">
        {isSearching && searching && <p className="text-muted">খোঁজা হচ্ছে...</p>}
        {!isSearching && loading && <p className="text-muted">লোড হচ্ছে...</p>}

        {!isSearching && tab === "new" && dailyLimitReached && !loading && (
          <div className="bg-white rounded-card p-5 text-center">
            <p className="font-semibold mb-1">আজকের ৫০টা শব্দ শেষ! 🎉</p>
            <p className="text-muted text-sm">
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
          <p className="text-muted text-center mt-10">কোনো শব্দ পাওয়া যায়নি।</p>
        )}

        {!isSearching && !loading && !dailyLimitReached && words.length === 0 && (
          <p className="text-muted text-center mt-10">
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
              className="bg-brand text-white font-semibold rounded-card py-3 mt-2 mb-20"
            >
              {advancing ? "..." : "পরবর্তী ➜"}
            </button>
          )}
      </div>
    </main>
  );
}
  
