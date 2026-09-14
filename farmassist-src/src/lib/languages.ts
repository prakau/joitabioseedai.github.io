export const answerLanguages = [
  { name: "English", native: "English", locale: "en-IN", speech: "en-IN" },
  { name: "Hindi", native: "हिन्दी", locale: "hi-IN", speech: "hi-IN" },
  { name: "Haryanvi", native: "हरियाणवी", locale: "bgc-IN", speech: "hi-IN" },
  { name: "Punjabi", native: "ਪੰਜਾਬੀ", locale: "pa-IN", speech: "pa-IN" },
  { name: "Marathi", native: "मराठी", locale: "mr-IN", speech: "mr-IN" },
  { name: "Gujarati", native: "ગુજરાતી", locale: "gu-IN", speech: "gu-IN" },
  { name: "Bengali", native: "বাংলা", locale: "bn-IN", speech: "bn-IN" },
  { name: "Tamil", native: "தமிழ்", locale: "ta-IN", speech: "ta-IN" },
  { name: "Telugu", native: "తెలుగు", locale: "te-IN", speech: "te-IN" },
  { name: "Kannada", native: "ಕನ್ನಡ", locale: "kn-IN", speech: "kn-IN" },
  { name: "Malayalam", native: "മലയാളം", locale: "ml-IN", speech: "ml-IN" },
  { name: "Odia", native: "ଓଡ଼ିଆ", locale: "or-IN", speech: "or-IN" },
  { name: "Assamese", native: "অসমীয়া", locale: "as-IN", speech: "as-IN" },
  { name: "Urdu", native: "اردو", locale: "ur-IN", speech: "ur-IN" },
] as const;

export function answerLanguage(name: string) {
  return (
    answerLanguages.find((language) => language.name === name) ||
    answerLanguages[0]
  );
}

export function matchingVoice<
  T extends { lang: string; localService: boolean },
>(voices: T[], locale: string, offline = false) {
  const available = voices.filter((voice) => !offline || voice.localService);
  const normalize = (code: string) => code.toLowerCase().replace(/_/g, "-");
  return (
    available.find((voice) => normalize(voice.lang) === normalize(locale)) ||
    available.find(
      (voice) =>
        normalize(voice.lang).split("-")[0] === normalize(locale).split("-")[0],
    )
  );
}

// Short utterances avoid long-text playback stalls on mobile speech engines.
export function speechChunks(text: string): string[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  const chunks: string[] = [];
  let chunk = "";
  for (const word of words) {
    if (chunk && chunk.length + word.length > 150) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk = chunk ? `${chunk} ${word}` : word;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}
