import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="create"
        options={{
          presentation: "modal",
          title: "Новая привычка",
          headerStyle: { backgroundColor: "#1E1E1E" },
          headerTitleStyle: { color: "white" },
          headerTintColor: "white",
        }}
      />
      {/* Добавим экран modal, чтобы он не вызывал ошибок */}
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
