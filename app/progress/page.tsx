"use client";

import { useState } from "react";

export default function RedesignedProgressPage() {
  const [selectedLevel, setSelectedLevel] = useState("B1");

  // UI টেস্টের জন্য ডামি ডাটা
  const user = {
    display_name: "রাহাত",
    streak_count: 7,
    xp_points: 1450,
  };

  const levels = [
    { id: "A1", label: "A1 • Beginner" },
    { id: "A2", label: "A2 • Elementary" },
    { id: "B1", label: "B1 • Intermediate" },
    { id: "B2", label: "B2 • Advanced" },
  ];

  const weeklyActivity = [
    { day: "শনি", score: 80 },
    { day: "রবি", score: 100 },
    { day: "সোম", score: 40 },
    { day: "মঙ্গল", score: 90 },
    { day: "বুধ", score: 60 },
    { day: "বৃহ", score: 100 },
    { day: "শুক্র", score: 20 },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 pb-28 p-4 max-w-md mx-auto font-sans">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase">
            Analytics Overview
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">লার্নিং প্রোগ্রেস</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-full text-xs font-bold text-amber-400 shadow-inner">
          ⚡ {user.xp_points} XP
        </div>
      </div>

      {/* Hero Profile & Streak Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-5 border border-slate-700/60 shadow-2xl mb-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl">
              {user.display_name.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-white text-base">{user.display_name}</h2>
              <p className="text-xs text-slate-400">নিয়মিত লার্নার</p>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-amber-400 flex items-center gap-1.5">
            🔥 {user.streak_count} দিন স্ট্রিক
          </div>
        </div>

        {/* Level Selector Segment */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <label className="text-[11px] font-semibold text-slate-400 mb-2 block">
            বর্তমান লেভেল (CEFR Framework):
          </label>
          <div className="grid grid-cols-4 gap-1.5 bg-slate-950/60 p-1 rounded-2xl border border-slate-800">
            {levels.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedLevel === lvl.id
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {lvl.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Circular Progress & Daily Goal Section */}
      <div className="bg-slate-800/50 rounded-3xl p-5 border border-slate-700/50 backdrop-blur-md mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-sm">৬০ দিনের আর্চিজ চ্যালেঞ্জ</h3>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Day 12 of 60
          </span>
        </div>

        <div className="flex items-center gap-5 my-2">
          {/* Circular Chart */}
          <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-700"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-400"
                strokeDasharray="20, 100"
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-black text-white">20%</span>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-200">আজকের প্রোগ্রেস: ৪/৫ কাজ সম্পন্ন</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              আজকে আর ১টি সেন্টেন্স প্যাটার্ন শেষ করলেই আপনার দৈনিক গোল পূরণ হবে।
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Metric Cards Grid */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
        শিক্ষার বিস্তারিত পরিসংখ্যান
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Vocabulary Box */}
        <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/40 relative">
          <div className="text-xs font-bold text-purple-400 mb-1">ভোকাবুলারি</div>
          <div className="text-2xl font-black text-white">২৮ টি</div>
          <div className="text-[11px] text-slate-400 mt-0.5">শব্দ আয়ত্ত করেছেন</div>
          <div className="mt-3 pt-2 border-t border-slate-700/40 text-[10px] text-slate-300 flex items-center gap-1">
            <span className="text-amber-400">★</span> ৬টি সেভ করা
          </div>
        </div>

        {/* Sentences Box */}
        <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/40 relative">
          <div className="text-xs font-bold text-cyan-400 mb-1">বাক্য প্র্যাকটিস</div>
          <div className="text-2xl font-black text-white">১৬ টি</div>
          <div className="text-[11px] text-slate-400 mt-0.5">প্যাটার্ন সম্পন্ন</div>
          <div className="mt-3 pt-2 border-t border-slate-700/40 text-[10px] text-slate-300 flex items-center gap-1">
            <span className="text-emerald-400">✓</span> ৩টি ক্যাটাগরি
          </div>
        </div>
      </div>

      {/* Professional Activity Bar Chart */}
      <div className="bg-slate-800/40 rounded-3xl p-5 border border-slate-700/40">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white text-sm">সাপ্তাহিক অ্যাক্টিভিটি গ্রাফ</h3>
          <span className="text-[10px] text-slate-400 font-semibold">গত ৭ দিন</span>
        </div>

        <div className="flex justify-between items-end h-28 pt-4 px-1">
          {weeklyActivity.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
              <div className="w-6 bg-slate-900 rounded-t-lg h-full relative overflow-hidden flex items-end">
                <div
                  className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500"
                  style={{ height: `${item.score}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">{item.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
