"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

type Pattern = {
  id: number;
  pattern_en: string;
  pattern_bn: string;
  order_index: number;
};

type ProgressMap = Record<number, string>; // pattern_id -> status

export default function PatternListPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = Number(params.categoryId);

  const [categoryTitle, setCategoryTitle] = useState("");
  const [patterns, setPatterns] = useState<Pattern[]>([]);
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

      const { data: category } = await supabase
        .from("sentence_categories")
        .select("title_bn")
        .eq("id", categoryId)
        .maybeSingle();
      setCategoryTitle(category?.title_bn ?? "");

      const { data: patternRows } = await supabase
        .from("sentence_patterns")
        .select("*")
        .eq("category_id", categoryId)
        .order("order_index", { ascending: true });
      setPatterns((patternRows as Pattern[]) ?? []);

      const ids = (patternRows ?? []).map((p: any) => p.id);
      if (ids.length > 0) {
        const { data: progressRows } = await supabase
          .from("user_pattern_progress")
          .select("pattern_id, status")
          .eq("user_id", user.id)
          .in("pattern_id", ids);

        const map: ProgressMap = {};
        (progressRows ?? []).forEach((p: any) => {
          map[p.pattern_id] = p.status;
        });
        setProgress(map);
      }

      setLoading(false);
    }
    init();
  }, [categoryId]);

  function getStatus(index: number, patternId: number) {
    const status = progress[patternId];
    if (status) return status;
    if (index === 0) return "unlocked";

    const prevPattern = patterns[index - 1];
    const prevStatus = progress[prevPattern?.id];
    return prevStatus === "completed" ? "unlocked" : "locked";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-orange-50/30 via-amber-50/20 to-white p-5 pt-8">
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 bg-white/80 rounded-2xl animate-pulse border border-orange-100/60 shadow-sm"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-500/5 via-amber-500/5 to-white pt-6 pb-28 px-4 max-w-md mx-auto">
      {/* Header Section with Back Button */}
      <div className="flex items-center gap-3.5 mb-6 px-1">
        <button
          onClick={() => router.push("/sentences")}
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-700 text-lg hover:bg-slate-50 active:scale-95 transition-all flex-shrink-0"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-snug">
            {categoryTitle || "বাক্যের প্যাটার্ন"}
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            পছন্দের প্যাটার্ন নির্বাচন করে চর্চা শুরু করুন
          </p>
        </div>
      </div>

      {/* Pattern Cards List */}
      <div className="flex flex-col gap-3">
        {patterns.map((p, index) => {
          const status = getStatus(index, p.id);
          const isLocked = status === "locked";
          const isCompleted = status === "completed";

          const card = (
            <div
              className={`relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 flex items-center justify-between gap-3 ${
                isLocked
                  ? "bg-slate-50/80 border-slate-200/60 opacity-60 shadow-none"
                  : isCompleted
                  ? "bg-white border-emerald-100 shadow-sm hover:border-emerald-200 active:scale-[0.99]"
                  : "bg-white border-orange-100 shadow-md shadow-orange-500/5 hover:shadow-lg hover:border-orange-200 active:scale-[0.99]"
              }`}
            >
              <div className="flex-1">
                <h3
                  className={`font-bold text-base tracking-wide ${
                    isLocked ? "text-slate-500" : "text-slate-800"
                  }`}
                >
                  {p.pattern_en}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  {p.pattern_bn}
                </p>
              </div>

              {/* Status Icon Indicator */}
              <div className="flex-shrink-0">
                {isLocked ? (
                  <div className="w-8 h-8 rounded-xl bg-slate-200/60 text-slate-400 flex items-center justify-center text-xs">
                    🔒
                  </div>
                ) : isCompleted ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-emerald-500/30">
                    ✓
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-xs shadow-md shadow-orange-500/30">
                    ▶
                  </div>
                )}
              </div>
            </div>
          );

          return isLocked ? (
            <div key={p.id}>{card}</div>
          ) : (
            <Link key={p.id} href={`/sentences/${categoryId}/${p.id}`}>
              {card}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
