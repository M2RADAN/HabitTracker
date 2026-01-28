import React, { useEffect } from "react";
import { useRouter } from "expo-router";

// Redirect placeholder — actual achievements screen is located at app/(tabs)/achievements.tsx
export default function AchievementsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Replace current route with the tab route to avoid duplicate route definitions
    router.replace("/achievements");
  }, [router]);

  return null;
}
