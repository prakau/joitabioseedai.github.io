# JOITA FarmAssist for Android

Package: `com.joitabioseedai.farmassist`. This is the JOITA Bioseed AI app, not another developer's FarmAssist product. The original JOITA logo is used unchanged for the launcher, splash and web header.

## Test build

The APK is a debug-signed testing build, not a Google Play release. Android 7+ with an up-to-date Android System WebView is required. No subscription, new account or API-key entry is required. Install only the APK linked from this repository's release page. Android may ask you to allow installation from the browser; turn that permission off after installing.

Live AI, cloud speech, weather and mandi prices need internet. The HTML, JavaScript, crop guides and local tools are bundled in the APK and open without a first online visit. Notes and records remain inside the app on the device. Browser records are separate from Android records and are not automatically migrated. Uninstalling the app removes its saved data: export it first.

## Feature parity

- Same Ask, Diagnose, Weather, Market, Calendar, Soil, Sound, 3D Plot, Calculators, Income & Costs, Community notes and Settings views as the website.
- Same 14 AI answer languages; Google speech uses supported voices, with device voices as a fallback when available. Language coverage is stated in Settings.
- English/Hindi dashboard and navigation. Use the language switch above the page title; it is saved on the device and works offline. AI answer language is a separate preference. Detailed tool forms and offline crop guides are still in English.
- Native Android location permission and GPS lookup, clipboard, share sheet and file export. Record exports open the system save/share chooser.
- Crop photos use Android's file/camera chooser. Microphone access is requested only when starting a field recording. Location is requested only when choosing device location.
- Android Back closes the tools menu, returns a module to Home, then minimizes the app from Home.
- Live calls go to `https://www.joitabioseedai.com/api/`. Keys stay on Vercel; none are bundled in the APK. HTTPS only, no remote-webview start URL, no broad storage access, no automatic Android backup.

The same product limits apply on both platforms: photo advisory is not a laboratory diagnosis, sound activity is not validated EHI/species detection, Community is local notes rather than a public social network, and AI recommendations need local expert confirmation.

## Build and verify

Use Node 24, JDK 21, Android SDK 36 and the generated Gradle wrapper:

```sh
npm ci
npm run build:android
cd android
./gradlew :app:assembleDebug :app:connectedDebugAndroidTest
```

`npm run build` still writes the website to `../farmassist`; Android uses `dist-android` and `android/app/src/main/assets/public`. Do not commit generated bundles under the Android project, signing keys, `.env` files or APKs. Test APKs are distributed as release assets.

The `Android test APK` GitHub Actions workflow builds and verifies the APK signature, then runs the installed app in an Android emulator. Instrumentation tests cover bundled/offline startup, saved data, navigation, layout, a real live AI reply, cloud audio decoding and the dated mandi feed from Android's native origin. The workflow uses the public backend but receives no API secrets.

Before a Play Store release, configure a permanent release signing key and upload key, privacy/data-safety declarations, store assets and additional physical-device testing. Debug keys may change between test builds; a later test APK can require uninstalling the older one. Export records first.
