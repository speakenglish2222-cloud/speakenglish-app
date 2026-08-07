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
      <main className="p-5 pt-8">
        <p className="text-muted">লোড হচ্ছে...</p>
      </main>
    );
  }

  return (
    <main className="pt-8 pb-24">
      <div className="px-5 mb-4 flex items-center gap-3">
        <button onClick={() => router.push("/sentences")} className="text-xl">
          ←
        </button>
        <h1 className="text-lg font-bold">{categoryTitle}</h1>
      </div>

      <div className="px-5 flex flex-col gap-4">
        {patterns.map((p, index) => {
          const status = getStatus(index, p.id);
          const isLocked = status === "locked";
          const isCompleted = status === "completed";

          const card = (
            <div
              className={`bg-white rounded-card p-5 shadow-sm flex justify-between items-center ${
                isLocked ? "opacity-60" : ""
              }`}
            >
              <div>
                <h3 className="font-bold">{p.pattern_en}</h3>
                <p className="text-muted text-sm mt-1">{p.pattern_bn}</p>
              </div>
              <span className="text-xl ml-3">
                {isLocked ? "🔒" : isCompleted ? "✅" : "▶️"}
              </span>
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
