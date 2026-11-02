import {
  getApp,
  getApps,
  initializeApp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAnalytics,
  isSupported,
  logEvent,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const analyticsReady = firebaseConfig.measurementId
  ? isSupported()
    .then((supported) => (supported ? getAnalytics(app) : null))
    .catch((error) => {
      console.error("Firebase Analytics could not initialize.", error);
      return null;
    })
  : Promise.resolve(null);

export async function trackScreen(screenName) {
  const analytics = await analyticsReady;
  if (analytics) {
    logEvent(analytics, "screen_view", {
      firebase_screen: screenName,
      firebase_screen_class: "UniJosMart",
    });
  }
}
