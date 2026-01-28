/**
 * Notifications helper using expo-notifications
 *
 * Steps to enable:
 * 1) Install runtime packages:
 *    expo install expo-notifications expo-device
 * 2) For push notifications you'll need an Expo push token and server-side logic.
 * 3) Use registerForPushNotificationsAsync() to request permissions and get token.
 * 4) Use scheduleLocalNotification(...) to show a local (scheduled) notification.
 *
 * Note: Local notifications work in both managed and bare Expo apps, but push notifications
 * require a physical device (not the simulator) to receive push tokens.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
// Some developer environments may not have expo-device types installed — silence TS here
// @ts-ignore
import * as Device from "expo-device";

// Ensure foreground notifications are shown as banner/list (avoid deprecated flags)
Notifications.setNotificationHandler({
  handleNotification:
    async (): Promise<Notifications.NotificationBehavior> => ({
      // `shouldShowAlert` is deprecated; prefer banner/list flags
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
});

export async function registerForPushNotificationsAsync(): Promise<{
  granted: boolean;
  token: string | null;
}> {
  try {
    if (!Device || !Device.isDevice) {
      console.log(
        "Notifications: physical device recommended for push tokens.",
      );
      // Still request permissions for local/foreground behavior
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notifications permission not granted.");
      return { granted: false, token: null };
    }

    // Avoid attempting to get push token automatically in Expo Go / when projectId is missing.
    // Only try to fetch token when running on a physical device and when the runtime supports it.
    let token: string | null = null;
    try {
      if (Device && Device.isDevice) {
        try {
          const tokenResponse: any = await (
            Notifications as any
          ).getExpoPushTokenAsync();
          token = tokenResponse?.data ?? null;
        } catch (err) {
          // Expected in Expo Go or when projectId is missing; log and continue.
          console.log(
            "Unable to obtain push token (simulator or network issue):",
            err,
          );
        }
      } else {
        console.log("Device is not physical; skipping push token retrieval.");
      }
    } catch (err) {
      console.log(
        "Unexpected error while attempting push token retrieval:",
        err,
      );
    }

    // On Android, configure channel for notifications
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return { granted: true, token };
  } catch (error) {
    console.log("Error registering for notifications:", error);
    return { granted: false, token: null };
  }
}

/**
 * Schedule a local notification after `seconds` seconds. Use small seconds (>=1) for quick testing.
 */
export async function scheduleLocalNotification({
  title,
  body,
  seconds = 5,
}: {
  title: string;
  body: string;
  seconds?: number;
}) {
  try {
    // Use an explicit timeInterval trigger to match SDK expectations
    // For Android include channelId (we created 'default' above)
    const trigger: any = { type: "timeInterval", seconds, repeats: false };
    if (Platform.OS === "android") {
      trigger.channelId = "default";
    }
    await (Notifications as any).scheduleNotificationAsync({
      content: { title, body, data: { scheduledAt: Date.now() } },
      trigger,
    });
  } catch (error) {
    console.log("Error scheduling local notification:", error);
  }
}

export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log("Error cancelling notifications:", error);
  }
}

/**
 * Convenience: request permissions and immediately schedule a test notification (useful for UI button)
 */
export async function requestAndShowTestNotification() {
  const { granted } = await registerForPushNotificationsAsync();
  if (granted) {
    await scheduleLocalNotification({
      title: "Test",
      body: "This is a local notification from HabitTracker",
      seconds: 3,
    });
  }
}
