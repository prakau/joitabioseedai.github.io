import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.joitabioseedai.farmassist",
  appName: "JOITA FarmAssist",
  webDir: "dist-android",
  server: { androidScheme: "https" },
  android: { backgroundColor: "#f8faf9", allowMixedContent: false },
};
export default config;
