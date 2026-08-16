"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Mode = "onboarding" | "edit";

type UserResult = {
  id: string;
  name: string | null;
  current_level: string;
};

const LEVELS = [
  {
    key: "level1",
    emoji: "🐣",
    title: "বিগিনার / কিডস",
    desc: "সহজ শব্দ ও প্রাথমিক বাক্য",
  },
  {
    key: "level2",
    emoji: "📘",
    title: "বেসিক",
    desc: "রোজকার সহজ শব্দভান্ডার",
  },
  {
    key: "level3",
    emoji: "🚀",
    title: "ইন্টারমিডিয়েট",
    desc: "দৈনন্দিন কথোপকথন",
  },
  {
    key: "level4",
    emoji: "👑",
    title: "অ্যাডভান্সড",
    desc: "ফ্লুয়েন্সি ও স্মার্ট ইংলিশ",
  },
];

const GOALS = [
  { key: "5min", label: "⚡ ৫ মি." },
  { key: "10min", label: "🔥 ১০ মি." },
  { key: "15min", label: "🏆 ১৫ মি." },
];

export default function OnboardingModal({
  mode,
  deviceId,
  userId,
  initialName,
  initialLevel,
  onComplete,
  onClose,
}: {
  mode: Mode;
  deviceId?: string;
  userId?: string;
  initialName?: string;
  initialLevel?: string;
  onComplete: (user: UserResult) => void;
  onClose?: () => void;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [level, setLevel] = useState(initialLevel ?? "level1");
  const [goal, setGoal] = useState("10min");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("অনুগ্রহ করে আপনার নাম লিখুন!");
      return;
    }

    setError("");
    setSaving(true);

    try {
      if (mode === "onboarding") {
        const { data } = await supabase
          .from("users")
          .insert({
            device_id: deviceId,
            name: name.trim() || null,
            current_level: level,
          })
          .select()
          .single();

        if (data) onComplete(data as UserResult);
      } else {
        const { data } = await supabase
          .from("users")
          .update({ name: name.trim() || null, current_level: level })
          .eq("id", userId)
          .select()
          .single();

        if (data) onComplete(data as UserResult);
      }
    } catch (err) {
      console.error("Save Error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-card p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto relative shadow-xl">
        
        <div className="text-center mb-5">
          <p className="text-3xl mb-1 animate-bounce">✨</p>
          <h2 className="text-lg font-extrabold text-slate-800">
            {mode === "onboarding"
              ? "স্বাগতম 'SpeakEnglish'-এ!"
              : "লেভেল পরিবর্তন করো"}
          </h2>
          <p className="text-muted text-xs mt-1">
            আপনার শেখার অভিজ্ঞতা কাস্টমাইজ করুন
          </p>
        </div>

        {/* ১. নাম ইনপুট */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            ১. আপনার নাম লিখুন
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400">👤</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="যেমন: স্বপ্ন দেব"
              className={`w-full border ${
                error ? "border-rose-500" : "border-gray-200"
              } rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand`}
            />
          </div>
          {error && (
            <p className="text-[11px] text-rose-500 font-semibold mt-1">
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* ২. লেভেল সিলেক্ট */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            ২. আপনার লেভেল নির্বাচন করুন
          </label>
          <div className="flex flex-col gap-2">
            {LEVELS.map((l) => {
              const isSelected = level === l.key;
              return (
                <button
                  key={l.key}
                  onClick={() => setLevel(l.key)}
                  className={`text-left border rounded-xl px-3.5 py-2.5 flex items-center justify-between transition-all ${
                    isSelected
                      ? "border-brand bg-brand/10 font-bold shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{l.emoji}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {l.title}
                      </p>
                      <p className="text-muted text-[10px]">{l.desc}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected
                        ? "bg-brand text-white"
                        : "bg-gray-100 text-transparent"
                    }`}
                  >
                    ✓
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ৩. দৈনিক টার্গেট */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            ৩. দৈনিক লক্ষ্য বাছুন
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGoal(g.key)}
                className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  goal === g.key
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-gray-200 text-slate-600 hover:bg-gray-50"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* সাবমিট বাটন */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-brand text-white font-bold rounded-card py-3 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
        >
          <span>
            {saving
              ? "সংরক্ষণ হচ্ছে..."
              : mode === "onboarding"
              ? "প্র্যাকটিস শুরু করুন 🚀"
              : "সেভ করো"}
          </span>
        </button>

        {mode === "edit" && onClose && (
          <button
            onClick={onClose}
            className="w-full text-muted text-xs font-semibold mt-3 hover:underline"
          >
            বাতিল করো
          </button>
        )}
      </div>
    </div>
  );
}
