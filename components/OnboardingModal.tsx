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
    emoji: "🟢",
    title: "বিগিনার / কিডস",
    desc: "সহজ শব্দ ও প্রাথমিক বাক্য",
  },
  {
    key: "level2",
    emoji: "🔵",
    title: "বেসিক",
    desc: "রোজকার সহজ শব্দভান্ডার",
  },
  {
    key: "level3",
    emoji: "🟡",
    title: "ইন্টারমিডিয়েট",
    desc: "দৈনন্দিন কথোপকথন",
  },
  {
    key: "level4",
    emoji: "🔴",
    title: "অ্যাডভান্সড",
    desc: "ফ্লুয়েন্সি ও স্মার্ট ইংলিশ",
  },
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
  const [level, setLevel] = useState(initialLevel ?? "level3");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);

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

    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <div className="text-center mb-5">
          <p className="text-2xl mb-1">✨</p>
          <h2 className="text-lg font-bold">
            {mode === "onboarding"
              ? "স্বাগতম 'SpeakEnglish'-এ!"
              : "লেভেল পরিবর্তন করো"}
          </h2>
          <p className="text-muted text-sm mt-1">
            আপনার শেখার অভিজ্ঞতা কাস্টমাইজ করুন
          </p>
        </div>

        <label className="block text-sm font-semibold mb-2">
          ১. আপনার নাম লিখুন
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="যেমন: রাহাত"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-5 focus:outline-none focus:ring-2 focus:ring-brand"
        />

        <label className="block text-sm font-semibold mb-2">
          ২. আপনার লেভেল নির্বাচন করুন
        </label>
        <div className="flex flex-col gap-2 mb-6">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLevel(l.key)}
              className={`text-left border rounded-xl px-4 py-3 ${
                level === l.key
                  ? "border-brand bg-brand/10"
                  : "border-gray-200 bg-white"
              }`}
            >
              <p className="font-semibold">
                {l.emoji} {l.title}
              </p>
              <p className="text-muted text-xs mt-0.5">{l.desc}</p>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-brand text-white font-semibold rounded-card py-3"
        >
          {saving
            ? "..."
            : mode === "onboarding"
            ? "প্র্যাকটিস শুরু করুন 🚀"
            : "সেভ করো"}
        </button>

        {mode === "edit" && onClose && (
          <button
            onClick={onClose}
            className="w-full text-muted text-sm mt-3"
          >
            বাতিল করো
          </button>
        )}
      </div>
    </div>
  );
}
