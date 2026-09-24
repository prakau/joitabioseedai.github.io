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

export function languageChoice(name: string) {
  return name === "Auto" ? "Auto" : answerLanguage(name).name;
}

export function resolveAnswerLanguage(
  choice: string,
  question: string,
  previous = "English",
) {
  if (/\b(?:reply|answer|respond|explain)\s+in\s+english\b/i.test(question)) return "English";
  if (/\b(?:hindi\s+(?:me|mein)|(?:reply|answer|respond)\s+in\s+hindi)\b|हिंदी\s*में|हिन्दी\s*में/i.test(question)) return "Hindi";
  const romanHindiWords = question.toLowerCase().match(/\b(?:meri|mera|mere|gehun|sarson|fasal|patte|patti|kya|kaise|sinchai|kheti|pani|kab|dena|chahiye|karu|kare|tamatar|peele|rahe|hain|batao)\b/g) || [];
  if ((choice === "English" || choice === "Auto") && new Set(romanHindiWords).size >= 2) return "Hindi";
  if (choice !== "Auto") return answerLanguage(choice).name;
  // Shared scripts cannot reliably distinguish dialects; an explicit choice always wins.
  const scripts: [RegExp, string][] = [
    [/[\u0a00-\u0a7f]/u, "Punjabi"],
    [/[\u0a80-\u0aff]/u, "Gujarati"],
    [/[\u0b80-\u0bff]/u, "Tamil"],
    [/[\u0c00-\u0c7f]/u, "Telugu"],
    [/[\u0c80-\u0cff]/u, "Kannada"],
    [/[\u0d00-\u0d7f]/u, "Malayalam"],
    [/[\u0b00-\u0b7f]/u, "Odia"],
    [/[\u0600-\u06ff]/u, "Urdu"],
    [/[\u0980-\u09ff]/u, /[ৰৱ]/u.test(question) ? "Assamese" : "Bengali"],
    [/[\u0900-\u097f]/u, "Hindi"],
  ];
  const detected = scripts
    .map(([script, name]) => ({
      name,
      count: [...question].filter((char) => script.test(char)).length,
    }))
    .sort((a, b) => b.count - a.count)[0];
  if (detected.count) return detected.name;
  if (
    /\b(meri|mera|mere|gehun|sarson|fasal|patt[ei]|kya|kaise|sinchai|kheti)\b/i.test(
      question,
    )
  )
    return "Hindi";
  if (
    /^(yes|no|ok|okay|thanks|thank you|\d[\d\s.,%]*)[.!?]*$/i.test(
      question.trim(),
    )
  )
    return answerLanguage(previous).name;
  return "English";
}

const nativeHelp: Record<string, [string, string, string]> = {
  English: [
    "What is happening in your field?",
    "Tomato leaves are yellowing and curling. What should I check?",
    "Explain this more simply. What should I check first?",
  ],
  Hindi: [
    "आपके खेत में क्या समस्या है?",
    "टमाटर की पत्तियां पीली हो रही हैं और मुड़ रही हैं। क्या जांच करूं?",
    "इसे आसान शब्दों में समझाएं। सबसे पहले क्या जांच करूं?",
  ],
  Haryanvi: [
    "आपके खेत में के दिक्कत है?",
    "सरसों में फूल आ रहे सैं। सबसे पहले के देखूं?",
    "आसान बोली में समझाओ। सबसे पहले के देखूं?",
  ],
  Punjabi: [
    "ਤੁਹਾਡੇ ਖੇਤ ਵਿੱਚ ਕੀ ਸਮੱਸਿਆ ਹੈ?",
    "ਕਣਕ ਦੇ ਪੱਤੇ ਪੀਲੇ ਹੋ ਰਹੇ ਹਨ। ਮੈਨੂੰ ਕੀ ਜਾਂਚਣਾ ਚਾਹੀਦਾ ਹੈ?",
    "ਇਸ ਨੂੰ ਸੌਖੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਸਮਝਾਓ। ਪਹਿਲਾਂ ਕੀ ਜਾਂਚਾਂ?",
  ],
  Marathi: [
    "तुमच्या शेतात काय अडचण आहे?",
    "टोमॅटोची पाने पिवळी पडून वळत आहेत. काय तपासावे?",
    "हे सोप्या शब्दांत समजावून सांगा. आधी काय तपासावे?",
  ],
  Gujarati: [
    "તમારા ખેતરમાં શું સમસ્યા છે?",
    "ટામેટાંનાં પાન પીળાં પડીને વળી રહ્યાં છે. શું તપાસવું?",
    "આ સરળ શબ્દોમાં સમજાવો. પહેલાં શું તપાસવું?",
  ],
  Bengali: [
    "আপনার খেতে কী সমস্যা হচ্ছে?",
    "টমেটোর পাতা হলুদ হয়ে কুঁকড়ে যাচ্ছে। কী পরীক্ষা করব?",
    "সহজ ভাষায় বুঝিয়ে বলুন। প্রথমে কী পরীক্ষা করব?",
  ],
  Tamil: [
    "உங்கள் வயலில் என்ன பிரச்சினை?",
    "தக்காளி இலைகள் மஞ்சளாகி சுருண்டுள்ளன. எதைச் சரிபார்க்க வேண்டும்?",
    "இதை எளிய சொற்களில் விளக்குங்கள். முதலில் எதைச் சரிபார்க்க வேண்டும்?",
  ],
  Telugu: [
    "మీ పొలంలో ఏమి సమస్య ఉంది?",
    "టమాటా ఆకులు పసుపుగా మారి ముడుచుకుంటున్నాయి. ఏమి పరిశీలించాలి?",
    "దీన్ని సులభమైన మాటల్లో వివరించండి. మొదట ఏమి పరిశీలించాలి?",
  ],
  Kannada: [
    "ನಿಮ್ಮ ಹೊಲದಲ್ಲಿ ಏನು ಸಮಸ್ಯೆ ಇದೆ?",
    "ಟೊಮೇಟೊ ಎಲೆಗಳು ಹಳದಿಯಾಗಿ ಮುದುಡುತ್ತಿವೆ. ಏನು ಪರಿಶೀಲಿಸಬೇಕು?",
    "ಇದನ್ನು ಸರಳವಾಗಿ ವಿವರಿಸಿ. ಮೊದಲು ಏನು ಪರಿಶೀಲಿಸಬೇಕು?",
  ],
  Malayalam: [
    "നിങ്ങളുടെ കൃഷിയിടത്തിൽ എന്താണ് പ്രശ്നം?",
    "തക്കാളിയുടെ ഇലകൾ മഞ്ഞനിറമായി ചുരുളുന്നു. എന്താണ് പരിശോധിക്കേണ്ടത്?",
    "ഇത് ലളിതമായി വിശദീകരിക്കൂ. ആദ്യം എന്താണ് പരിശോധിക്കേണ്ടത്?",
  ],
  Odia: [
    "ଆପଣଙ୍କ କ୍ଷେତରେ କଣ ସମସ୍ୟା ହେଉଛି?",
    "ଟମାଟୋ ପତ୍ର ହଳଦିଆ ହୋଇ ମୋଡ଼ି ହେଉଛି। କଣ ଯାଞ୍ଚ କରିବି?",
    "ଏହା ସରଳ ଭାଷାରେ ବୁଝାନ୍ତୁ। ପ୍ରଥମେ କଣ ଯାଞ୍ଚ କରିବି?",
  ],
  Assamese: [
    "আপোনাৰ পথাৰত কি সমস্যা হৈছে?",
    "বিলাহীৰ পাত হালধীয়া হৈ কোঁচ খাইছে। কি পৰীক্ষা কৰিম?",
    "এইটো সহজ ভাষাত বুজাই দিয়ক। প্ৰথমে কি পৰীক্ষা কৰিম?",
  ],
  Urdu: [
    "آپ کے کھیت میں کیا مسئلہ ہے؟",
    "ٹماٹر کے پتے پیلے ہو کر مڑ رہے ہیں۔ مجھے کیا جانچنا چاہیے؟",
    "اسے آسان الفاظ میں سمجھائیں۔ پہلے کیا جانچوں؟",
  ],
};

export function advisoryLanguageHelp(language: string) {
  const [heading, example, simplify] =
    nativeHelp[language] || nativeHelp.English;
  return { heading, example, simplify };
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
