"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

type UserRow = {
  id: string;
  device_id: string;
  current_level: string;
  streak_count: number;
  challenge_start_date: string;
};

const LEVEL_LABELS: Record<string, string> = {
  level1: "বিগিনার / কিডস ভোকাবুলারি",
  level2: "বেসিক ভোকাবুলারি",
  level3: "ইন্টারমিডিয়েট (স্পোকেন ও ক্যারিয়ার)",
  level4: "অ্যাডভান্সড ভোকাবুলারি",
};

export default function HomePage() {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrCreateUser() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      // এই device_id এর ইউজার আগে থেকে আছে কিনা দেখা
      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (existing) {
        setUser(existing as UserRow);
      } else {
        // নতুন ইউজার — একটা রো তৈরি করা
        const { data: created } = await supabase
          .from("users")
          .insert({ device_id: deviceId })
          .select()
          .single();
        setUser(created as UserRow);
      }
      setLoading(false);
    }

    loadOrCreateUser();
  }, []);

  const daysSinceStart = user
    ? Math.min(
        60,
        Math.floor(
          (Date.now() - new Date(user.challenge_start_date).getTime()) /
            (1000 * 60 * 60 * 24)
