"use client";

export default function ProgressPageOnlyUI() {
  // UI টেস্টের জন্য ডামি ডাটা
  const user = {
    display_name: "রাহাত",
    skill_level_text: "বিগিনার / কিডস ভোকাবুলারি",
    streak_count: 5,
  };

  const weeklyLogs = [true, true, true, false, true, true, false];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 p-4 max-w-md mx-auto">
      {/* Header Card matching App Color */}
      <div className="bg-gradient-to-r from-[#00A86B] to-[#028A58] text-white rounded-[28px] p-6 shadow-xl shadow-[#00A86B]/20 mb-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-xs font-medium text-white/80">স্বাগতম</div>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-2xl font-bold">Hi, {user.display_name} 👋</h1>
            <button className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-3 py-1 rounded-full text-xs font-semibold transition border border-white/20">
              ⚙️ চেঞ্জ
            </button>
          </div>

          {/* Skill Level Badge */}
          <div className="mt-3 inline-flex items-center bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold">
            {user.skill_level_text}
          </div>

          {/* Streak Pill */}
          <div className="mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 bg-black/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300">
              🔥 {user.streak_count} দিন
            </div>
          </div>
        </div>
      </div>

      {/* 60-Day Challenge Box */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-5">
        <div className="flex justify-between items-center mb-1.5">
          <h3 className="font-bold text-gray-800 text-base">৬০ দিনের চ্যালেঞ্জ</h3>
          <span className="text-xs font-bold text-[#00A86B] bg-[#E8F8F2] px-2.5 py-1 rounded-full">
            ১৭%
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">১০ তম দিনের লক্ষ্য পূরণ বাকি 🎯</p>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-[#00A86B] h-3 rounded-full w-[17%]"></div>
        </div>
      </div>

      {/* Statistics Cards */}
      <h3 className="font-bold text-gray-800 mb-3 text-sm px-1">আপনার শিক্ষা ড্যাশবোর্ড</h3>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Words Card */}
        <div className="bg-gradient-to-br from-[#7C4DFF] to-[#651FFF] text-white p-5 rounded-[24px] shadow-lg shadow-[#7C4DFF]/20 relative overflow-hidden">
          <div className="text-3xl mb-2">📚</div>
          <div className="text-2xl font-bold">২৪ টি</div>
          <div className="text-xs text-white/80 mt-1 font-medium">শেখা শব্দ</div>
          <div className="mt-3 text-[11px] bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-lg inline-block font-semibold">
            ★ ৫টি বুকমার্ক
          </div>
        </div>

        {/* Sentences Card */}
        <div className="bg-gradient-to-br from-[#FF6D00] to-[#FF9100] text-white p-5 rounded-[24px] shadow-lg shadow-[#FF6D00]/20 relative overflow-hidden">
          <div className="text-3xl mb-2">💬</div>
          <div className="text-2xl font-bold">১২ টি</div>
          <div className="text-xs text-white/80 mt-1 font-medium">শেখা বাক্য</div>
          <div className="mt-3 text-[11px] bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-lg inline-block font-semibold">
            ✓ ২ ক্যাটাগরি
          </div>
        </div>
      </div>

      {/* Weekly Activity Grid */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 text-sm mb-3.5">গত ৭ দিনের অ্যাক্টিভিটি</h3>
        <div className="flex justify-between items-center px-1">
          {["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র"].map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  weeklyLogs[idx]
                    ? "bg-[#00A86B] text-white shadow-md shadow-[#00A86B]/30 scale-105"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {weeklyLogs[idx] ? "✓" : ""}
              </div>
              <span className="text-[11px] text-gray-500 font-medium">{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
