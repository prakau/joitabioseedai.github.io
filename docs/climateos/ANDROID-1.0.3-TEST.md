# JOITAFA Android 1.0.3 test

Package: `com.joitabioseedai.farmassist`. Version code: 4.
Source commit: `68f0000e8ae2ecff7ac9ba5fb1bff02e7632c545`.

## New in this build

- Guided crop checks with up to three labelled photos and field context.
- Hindi voice questions: record/upload, review the transcription, then ask once.
- Crop cases connect saved advice, dated observations and calendar rechecks.
- Photo follow-ups retain the original case context and recent observations.
- Different-crop questions cannot silently enter the original crop case.
- English/Hindi guided controls and the existing advisory language choices.
- Backups preserve the new case links and remain compatible with older plain
  records. Case-containing backups use version 5; older apps cannot restore them.

## Verification

GitHub Android test run 39010362875 passed all four installed-app tests on the
Android 15/API 35 emulator, including bundled offline tools, persistent Hindi
dashboard, actual live Hindi advisory, speech playback, real crop-photo analysis,
case/recheck persistence, safety rules and Hindi voice-file transcription.
APK signature verification passed. Web regression run 39010350578 also passed.

The native market test accepts real dated records or a clearly unavailable feed
with official links and no invented prices. It does not certify that Data.gov.in
is currently available. The production service reported a connection failure
before an HTTP response during verification. No TLS checks were bypassed and no
credentials were changed. Retry the feed or use its official portal.

## Installation and data

This is a debug-signed test APK, not a Play Store release. Export your saved
records in Settings before replacing an earlier test app. Its signing certificate
may differ from the previous test build, requiring uninstall; uninstalling can
erase local records. Keep the private backup and restore it after installation.

Open the downloaded APK on your Android phone and follow Android's installation
prompts. Use the Hindi dashboard selector independently of the answer language.
Live AI, voice transcription, cloud read-aloud, weather and market APIs require
internet. Bundled tools, saved cases and records remain device-local; there is no
automatic web/Android synchronization or connected expert-review network.

Physical-device microphone/camera testing and real farmer field evaluation are
still needed. A phone's permissions, microphone quality and installed voices can
affect behavior. Voice/photo media are sent to providers for the requested check,
but not retained in app records. Do not submit personal/private information.
AI-assisted crop advice is not a confirmed diagnosis; confirm treatment decisions
with an approved local label, KVK or agriculture expert.
