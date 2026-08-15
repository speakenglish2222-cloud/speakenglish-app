"use client";

export default function ProfessionalProgressPage() {
  // টেস্টের জন্য ডামি ডাটা
  const user = {
    display_name: "রাহাত",
    skill_level_badge: "A1 • Beginner",
    streak_count: 5,
    xp_points: 1250,
  };

  const weeklyLogs = [
    { day: "শনি", active: true },
    { day: "রবি", active: true },
    { day: "সোম", active: true },
    { day: "মঙ্গল", active: false },
    { day: "বুধ", active: true },
    { day: "বৃহ", active: true },
    { day: "শুক্র", active: false },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24 p-4 max-w-md mx-auto font-sans">
      {/* 1. Dashboard Top Header Bar */}
      <div className="flex justify-between items-center mb-5 px-1 pt-2">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">আপনার অগ্রগতি</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">লার্নিং এনালাইটিক্স ও স্ট্যাটস</p>
        </div>
        <button className="flex items-center gap-1.5 bg-white border border-gray-200 shadow-sm px-3.5 py-1.5 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50">
          ⚙️ প্রোফাইল
        </button>
      </div>

      {/* 2. Compact User Summary Pill */}
      <div className="bg-white rounded-2xl p-3.5 border border-gray-200/80 shadow-sm flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#E8F8F2] flex items-center justify-center text-[#00A86B] font-black text-lg border border-[#00A86B]/20">
            {user.display_name.charAt(0)}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm leading-tight">{user.display_name}</h2>
            <span className="text-[11px] font-semibold text-[#00A86B]">{user.skill_level_badge}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-600">
          🔥 {user.streak_count} দিন স্ট্রিক
        </div>
      </div>

      {/* 3. Circular Main Progress Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-sm">৬০ দিনের চ্যালেঞ্জ</h3>
          <span className="text-xs font-bold text-white bg-[#00A86B] px-2.5 py-0.5 rounded-full">
            Day 10/60
          </span>
        </div>

        <div className="flex items-center gap-5">
          {/* SVG Progress Circle */}
          <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#00A86B]"
                strokeDasharray="17, 100"
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-black text-gray-800">17%</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-800">দৈনিক লক্ষ্য: ৫০% সম্পূর্ণ</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              আজকে আরও ৩টি শব্দ ও ১টি বাক্য প্র্যাকটিস করলে আজকের টার্গেট শেষ হবে।
            </p>
          </div>
        </div>
      </div>

      {/* 4. Professional Metric Cards (2x2 Grid Layout) */}
      <h3 className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-wider text-gray-400 px-1">
        পারফরম্যান্স পরিসংখ্যান
      </h3>
      
      <div className="grid grid-cols-2 gap-3.5 mb-5">
        {/* Learned Words */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#7C4DFF] flex items-center justify-center font-bold text-base mb-2">
            📖
          </div>
          <div className="text-2xl font-black text-gray-900">২৪</div>
          <div className="text-xs font-semibold text-gray-500 mt-0.5">শেখা শব্দাবলী</div>
          <div className="mt-2 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md inline-block">
            ★ ৫টি বুকমার্কড
          </div>
        </div>

        {/* Practice Sentences */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF6D00] flex items-center justify-center font-bold text-base mb-2">
            💬
          </div>
          <div className="text-2xl font-black text-gray-900">১২</div>
          <div className="text-xs font-semibold text-gray-500 mt-0.5">বাক্য প্যাটার্ন</div>
          <div className="mt-2 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md inline-block">
            ✓ ২ ক্যাটাগরি
          </div>
        </div>
      </div>

      {/* 5. GitHub/Duolingo Style Weekly Heatmap Bar */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 text-sm">সাপ্তাহিক অ্যাক্টিভিটি ট্র্যাকার</h3>
          <span className="text-[11px] font-bold text-gray-400">এই সপ্তাহ</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weeklyLogs.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <div
                className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  item.active
                    ? "bg-[#00A86B] text-white shadow-sm"
                    : "bg-gray-100 border border-gray-200/60 text-gray-300"
                }`}
              >
                {item.active ? "✓" : ""}
              </div>
              <span className="text-[10px] font-bold text-gray-400">{item.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
