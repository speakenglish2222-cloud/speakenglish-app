"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

type PatternInfo = {
  pattern_en: string;
  pattern_bn: string;
  category_id: number;
};

type Example = {
  example_en: string;
  example_bn: string;
};

export default function PatternLearnPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = Number(params.categoryId);
  const patternId = Number(params.patternId);

  const [userId, setUserId] = useState<string | null>(null);
  const [pattern, setPattern] = useState<PatternInfo | null>(null);
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (user) setUserId(user.id);

      const { data: patternRow } = await supabase
        .from("sentence_patterns")
        .select("pattern_en, pattern_bn, category_id")
        .eq("id", patternId)
        .maybeSingle();
      setPattern(patternRow as PatternInfo);

      const { data: exampleRows } = await supabase
        .from("pattern_examples")
        .select("example_en, example_bn")
        .eq("pattern_id", patternId)
        .order("order_index", { ascending: true });
      setExamples((exampleRows as Example[]) ?? []);

      setLoading(false);
    }
    init();
  }, [patternId]);

  function speak(text: string) {
    if (typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  async function handleContinue() {
    if (!userId) return;
    setSaving(true);

    // এখন প্র্যাকটিস কুইজ তৈরি হয়নি, তাই আপাতত "বাক্য শেখা" শেষ করলেই প্যাটার্ন completed
    await supabase.from("user_pattern_progress").upsert(
      {
        user_id: userId,
        pattern_id: patternId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,pattern_id" }
    );

    // ক্যাটাগরির সামগ্রিক প্রোগ্রেস আপডেট করা
    const { data: allPatterns } = await supabase
      .from("sentence_patterns")
      .select("id")
      .eq("category_id", categoryId);

    const { data: completedRows } = await supabase
      .from("user_pattern_progress")
      .select("pattern_id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .in(
        "pattern_id",
        (allPatterns ?? []).map((p: any) => p.id)
      );

    const total = allPatterns?.length ?? 0;
    const completed = completedRows?.length ?? 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const catStatus = completed >= total ? "completed" : "in_progress";

    await supabase.from("user_category_progress").upsert(
      {
        user_id: userId,
        category_id: categoryId,
        status: catStatus,
        progress_percent: percent,
      },
      { onConflict: "user_id,category_id" }
    );

    setSaving(false);
    router.push(`/sentences/${categoryId}`);
  }

  if (loading || !pattern) {
    return (
      <main className="p-5 pt-8">
        <p className="text-muted">লোড হচ্ছে...</p>
      </main>
    );
  }

  return (
    <main className="pt-8 pb-24">
      <div className="px-5 mb-4 flex items-center gap-3">
        <button
          onClick={() => router.push(`/sentences/${categoryId}`)}
          className="text-xl"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">বাক্য শেখো</h1>
      </div>

      <div className="px-5">
        <div className="bg-brand text-white rounded-card p-5 mb-5">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-bold">{pattern.pattern_en}</h2>
            <button
              onClick={() => speak(pattern.pattern_en)}
              className="text-lg ml-2"
            >
              🔊
            </button>
          </div>
          <p className="text-white/90 mt-2">{pattern.pattern_bn}</p>
        </div>

        <p className="text-muted text-sm mb-3">উদাহরণ বাক্য</p>

        <div className="flex flex-col gap-3 mb-6">
          {examples.map((ex, i) => (
            <div key={i} className="bg-white rounded-card p-4 shadow-sm flex gap-3">
              <button
                onClick={() => speak(ex.example_en)}
                className="text-brand text-lg mt-0.5"
              >
                🔊
              </button>
              <div>
                <p className="font-semibold">{ex.example_en}</p>
                <p className="text-muted text-sm mt-1">{ex.example_bn}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full bg-brand text-white font-semibold rounded-card py-3"
        >
          {saving ? "..." : "এগিয়ে যাও ➜"}
        </button>
      </div>
    </main>
  );
}
