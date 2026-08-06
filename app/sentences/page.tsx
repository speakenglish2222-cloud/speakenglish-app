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
    if (rec) return rec; // status/percent already known

    // কোনো রেকর্ড নেই — প্রথমটা আনলক, বাকিগুলো লক
    if (index === 0) return { status: "unlocked", percent: 0 };
    return { status: "locked", percent: 0 };
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
      <div className="px-5 mb-4">
        <h1 className="text-xl font-bold">বাক্য</h1>
      </div>

      <div className="px-5 flex flex-col gap-4">
        {categories.map((cat, index) => {
          const state = getCategoryState(index, cat.id);
          const isLocked = state.status === "locked";

          const cardContent = (
            <div
              className={`bg-white rounded-card p-5 shadow-sm ${
                isLocked ? "opacity-60" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold">{cat.title_en}</h3>
                  <p className="text-muted text-sm mt-1">{cat.title_bn}</p>
                </div>
                <span className="text-xl ml-3">
                  {isLocked ? "🔒" : state.status === "completed" ? "✅" : "▶️"}
                </span>
              </div>

              {!isLocked && (
                <div className="mt-3">
                  <div className="w-full bg-surface rounded-full h-2">
                    <div
                      className="bg-brand h-2 rounded-full"
                      style={{ width: `${state.percent}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-brand font-semibold mt-1">
                    {state.percent}%
                  </p>
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
