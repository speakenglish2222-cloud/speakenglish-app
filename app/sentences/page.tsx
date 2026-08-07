"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

type Category = {
  id: number;
  title_en: string;
  title_bn: string;
  order_index: number;
};

type ProgressMap = Record<number, { status: string; percent: number }>;

export default function SentencesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
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

      const { data: cats } = await supabase
        .from("sentence_categories")
        .select("*")
        .order("order_index", { ascending: true });

      setCategories((cats as Category[]) ?? []);

      const { data: progressRows } = await supabase
        .from("user_category_progress")
        .select("category_id, status, progress_percent")
        .eq("user_id", user.id);

      const map: ProgressMap = {};
      (progressRows ?? []).forEach((p: any) => {
        map[p.category_id] = {
          status: p.status,
          percent: p.progress_percent,
        };
      });
      setProgress(map);

      setLoading(false);
    }
    init();
  }, []);

  function getCategoryState(index: number, categoryId: number) {
    const rec = progress[categoryId];
    if (rec) return rec;

    // ১ম ক্যাটাগরি বাই-ডিফল্ট আনলক
    if (index === 0) return { status: "unlocked", percent: 0 };

    // আগের ক্যাটাগরি কমপ্লিট বা ১০০% হলে পরেরটি আনলক হবে
    const prevCategory = categories[index - 1];
    const prevProgress = prevCategory ? progress[prevCategory.id] : null;

    if (
      prevProgress &&
      (prevProgress.status === "completed" || prevProgress.percent === 100)
    ) {
      return { status: "unlocked", percent: 0 };
    }

    return { status: "locked", percent: 0 };
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-white p-5 pt-8">
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-white/80 rounded-3xl animate-pulse border border-slate-100 shadow-sm"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-500/5 via-indigo-500/5 to-white pt-8 pb-28 px-4 max-w-md mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            বাক্য প্র্যাকটিস
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            দৈনন্দিন জীবনের প্রয়োজনীয় বাক্য প্যাটার্ন শিখুন
          </p>
        </div>
        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
          🎯 {categories.length}টি ক্যাটাগরি
        </span>
      </div>

      {/* Category Cards Grid */}
      <div className="flex flex-col gap-3.5">
        {categories.map((cat, index) => {
          const state = getCategoryState(index, cat.id);
          const isLocked = state.status === "locked";
          const isCompleted = state.status === "completed" || state.percent === 100;

          const cardContent = (
            <div
              className={`relative overflow-hidden rounded-3xl p-5 border transition-all duration-300 ${
                isLocked
                  ? "bg-slate-50/80 border-slate-200/60 opacity-60 shadow-none"
                  : "bg-white border-indigo-100/80 shadow-md shadow-indigo-100/40 hover:shadow-lg hover:border-indigo-200 active:scale-[0.99]"
              }`}
            >
              {/* Status Badge & Content */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <h3
                    className={`font-bold text-base tracking-wide ${
                      isLocked ? "text-slate-500" : "text-slate-800"
                    }`}
                  >
                    {cat.title_en}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {cat.title_bn}
                  </p>
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {isLocked ? (
                    <div className="w-9 h-9 rounded-2xl bg-slate-200/60 text-slate-400 flex items-center justify-center text-sm">
                      🔒
                    </div>
                  ) : isCompleted ? (
                    <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold shadow-sm">
                      ✓
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md shadow-indigo-500/30">
                      ▶
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar (Only for Unlocked) */}
              {!isLocked && (
                <div className="mt-4 pt-3 border-t border-slate-100/80">
                  <div className="flex justify-between items-center text-[11px] font-bold mb-1.5">
                    <span className="text-slate-400">প্রোগ্রেস</span>
                    <span
                      className={
                        isCompleted ? "text-emerald-600" : "text-indigo-600"
                      }
                    >
                      {state.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? "bg-emerald-500"
                          : "bg-gradient-to-r from-indigo-500 to-purple-600"
                      }`}
                      style={{ width: `${state.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );

          return isLocked ? (
            <div key={cat.id}>{cardContent}</div>
          ) : (
            <Link key={cat.id} href={`/sentences/${cat.id}`}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
