import { supabase } from "@/lib/supabase";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// প্রতিদিন প্রথমবার কোনো শব্দ/বাক্য এক্টিভিটি করলে এটা কল করতে হবে
// (words page-এর handleNext আর sentences practice page-এর completePattern থেকে)
export async function logActivityAndUpdateStreak(userId: string) {
  const today = todayStr();
  const yesterday = yesterdayStr();

  // ১. আজকের এক্টিভিটি লগ করা (একই দিনে দ্বিতীয়বার হলে কিছু হবে না, unique constraint সামলাবে)
  await supabase
    .from("user_activity_log")
    .upsert(
      { user_id: userId, activity_date: today },
      { onConflict: "user_id,activity_date", ignoreDuplicates: true }
    );

  // ২. স্ট্রিক হিসাব করা
  const { data: user } = await supabase
    .from("users")
    .select("last_active_date, streak_count")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return;

  if (user.last_active_date === today) {
    return; // আজকে ইতিমধ্যে গণনা হয়ে গেছে
  }

  let newStreak: number;
  if (user.last_active_date === yesterday) {
    newStreak = (user.streak_count ?? 0) + 1; // ধারাবাহিকতা বজায় আছে
  } else {
    newStreak = 1; // একদিন মিস হয়েছে বা প্রথমবার
  }

  await supabase
    .from("users")
    .update({ last_active_date: today, streak_count: newStreak })
    .eq("id", userId);
}
