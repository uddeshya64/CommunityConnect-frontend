import { api } from "@/lib/axios";

// Helper to convert base64 VAPID public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushNotificationService = {
  // Check if browser and device support Push API and Service Workers
  isPushSupported(): boolean {
    if (typeof window === "undefined") return false;
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  },

  // Register the service worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isPushSupported()) return null;

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;
      return registration;
    } catch (err) {
      console.error("Service worker registration failed:", err);
      return null;
    }
  },

  // Sync existing browser subscription to currently authenticated backend user
  async syncSubscriptionWithBackend(): Promise<boolean> {
    if (!this.isPushSupported()) return false;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return false;

      const deviceType = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? "ios"
        : /Android/i.test(navigator.userAgent)
        ? "android"
        : /Windows/i.test(navigator.userAgent)
        ? "windows"
        : /Macintosh/i.test(navigator.userAgent)
        ? "mac"
        : "browser";

      await api.post("/notifications/push/subscribe", {
        subscription: subscription.toJSON(),
        device: deviceType,
        userAgent: navigator.userAgent,
      });
      return true;
    } catch (e) {
      console.warn("Failed to auto-sync push subscription with backend:", e);
      return false;
    }
  },

  // Get current permission and subscription status
  async getStatus(): Promise<{
    supported: boolean;
    permission: NotificationPermission | "unsupported";
    isSubscribed: boolean;
    subscription: PushSubscription | null;
  }> {
    if (!this.isPushSupported()) {
      return {
        supported: false,
        permission: "unsupported",
        isSubscribed: false,
        subscription: null,
      };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      let isSubscribed = false;

      if (token) {
        try {
          const res = await api.get("/notifications/push/status");
          isSubscribed = !!res.data.isSubscribed;
        } catch {
          isSubscribed = false;
        }
      } else {
        isSubscribed = !!subscription && Notification.permission === "granted";
      }

      return {
        supported: true,
        permission: Notification.permission,
        isSubscribed,
        subscription,
      };
    } catch (e) {
      return {
        supported: true,
        permission: Notification.permission,
        isSubscribed: false,
        subscription: null,
      };
    }
  },

  // Request permission, subscribe, and sync with backend
  async subscribeToPush(): Promise<{ success: boolean; error?: string; message?: string }> {
    if (!this.isPushSupported()) {
      return { success: false, error: "Push notifications are not supported by this browser." };
    }

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return {
          success: false,
          error: permission === "denied"
            ? "Notification permission was blocked in your browser settings."
            : "Notification permission was dismissed.",
        };
      }

      // 2. Fetch VAPID public key from backend
      const { data: vapidData } = await api.get("/notifications/push/vapid-key");
      const publicKey = vapidData.publicKey;

      if (!publicKey) {
        return { success: false, error: "Failed to retrieve VAPID public key from server." };
      }

      // 3. Register service worker and subscribe to PushManager
      const registration = await this.registerServiceWorker();
      if (!registration) {
        return { success: false, error: "Failed to activate service worker." };
      }

      // Unsubscribe any existing stale subscription first
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        try {
          await existingSub.unsubscribe();
        } catch (e) {
          // ignore
        }
      }

      const convertedKey = urlBase64ToUint8Array(publicKey);
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });

      // 4. Send subscription JSON to backend
      const subscriptionJSON = pushSubscription.toJSON();
      
      const deviceType = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? "ios"
        : /Android/i.test(navigator.userAgent)
        ? "android"
        : /Windows/i.test(navigator.userAgent)
        ? "windows"
        : /Macintosh/i.test(navigator.userAgent)
        ? "mac"
        : "browser";

      await api.post("/notifications/push/subscribe", {
        subscription: subscriptionJSON,
        device: deviceType,
        userAgent: navigator.userAgent,
      });

      return { success: true, message: "System push notifications enabled successfully!" };
    } catch (err: any) {
      console.error("Push subscription error:", err);
      return {
        success: false,
        error: err.response?.data?.error || err.message || "Failed to enable push notifications.",
      };
    }
  },

  // Unsubscribe from push service and inform backend
  async unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
    if (!this.isPushSupported()) {
      return { success: false, error: "Push notifications not supported." };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await api.post("/notifications/push/unsubscribe", { endpoint });
      }

      return { success: true };
    } catch (err: any) {
      console.error("Unsubscribe error:", err);
      return { success: false, error: err.message || "Failed to unsubscribe." };
    }
  },

  // Send an instant test push notification to this user's active device(s)
  async sendTestPush(): Promise<{ success: boolean; message: string }> {
    try {
      // Ensure backend has current user linked to this subscription
      await this.syncSubscriptionWithBackend();

      const res = await api.post("/notifications/push/test");
      return {
        success: true,
        message: res.data.message || "Test notification dispatched!",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.error || err.message || "Failed to send test push notification.",
      };
    }
  },
};
