import { useStored } from "./storage";

export type InterfaceLanguage = "en" | "hi";
const hindi: Record<string, string> = {
  "Start a question": "सवाल शुरू करें", "Leaf symptoms": "पत्तियों के लक्षण", "Irrigation": "सिंचाई", "Crop planning": "फसल की योजना",
  "What should I check before irrigating my crop?": "फसल की सिंचाई से पहले मुझे क्या जांचना चाहिए?",
  "What information do you need to help me plan my next crop?": "अगली फसल की योजना बनाने के लिए आपको कौन सी जानकारी चाहिए?",
  Home: "होम", Ask: "पूछें", Diagnose: "फसल जांच", "EHI / Sound": "खेत की आवाज़",
  Weather: "मौसम", Calendar: "कैलेंडर", Calculators: "कैलकुलेटर", "Income & Costs": "आय और खर्च",
  "3D Plot": "3D खेत", Soil: "मिट्टी", Market: "मंडी", Community: "समुदाय", About: "परिचय", Settings: "सेटिंग्स", More: "और",
  "By JOITA Bioseed AI": "JOITA Bioseed AI द्वारा",
  "Device online": "डिवाइस ऑनलाइन", "Device offline": "डिवाइस ऑफलाइन", "Checking backend": "सर्वर की जांच जारी",
  "Backend connected": "सर्वर से जुड़ा है", "Backend unavailable": "सर्वर उपलब्ध नहीं",
  "Live AI online": "लाइव AI उपलब्ध", "Live AI temporarily unavailable": "लाइव AI अभी उपलब्ध नहीं",
  "Live AI not configured": "लाइव AI कॉन्फ़िगर नहीं है",
  "JOITAFA home": "JOITAFA होम", "JOITA website": "JOITA वेबसाइट", "Toggle navigation": "मेन्यू खोलें या बंद करें",
  "YOUR WORKSPACE": "आपका कार्यक्षेत्र", "My farm": "मेरा खेत", "Contact our team": "हमारी टीम से संपर्क करें",
  "Device offline. Crop guides and saved records remain available. Live services will need a connection.": "डिवाइस ऑफलाइन है। फसल की जानकारी और सहेजे हुए रिकॉर्ड उपलब्ध हैं। लाइव सेवाओं के लिए इंटरनेट चाहिए।",
  "Good farming. Clear next steps.": "बेहतर खेती। सही अगला कदम।",
  "YOUR JOITA FIELD DESK": "आपका JOITA खेती सहायक",
  "Your JOITA field desk": "आपका JOITA खेती सहायक",
  "One question. A clearer next step.": "अपना सवाल पूछें। अगला कदम जानें।",
  "What would you like to check today?": "आज आप क्या जानना चाहते हैं?",
  "My tomato leaves are curling. What should I check?": "मेरे टमाटर की पत्तियां मुड़ रही हैं। क्या जांच करूं?",
  "Crop advisory support only": "केवल फसल सलाह में सहायता", "Ask JOITAFA": "JOITAFA से पूछें", "OUT IN THE FIELD": "खेत के काम",
  "Check a crop photo": "फसल की फोटो जांचें", "Symptoms & practical checks": "लक्षण और ज़रूरी जांच",
  "Plan around the weather": "मौसम देखकर योजना बनाएं", "Local forecast & rain outlook": "स्थानीय मौसम और बारिश का पूर्वानुमान",
  "Compare mandi prices": "मंडी के भाव देखें", "Dated AGMARKNET records": "तारीख सहित AGMARKNET के भाव",
  "Your saved conversations": "आपके सहेजे हुए सवाल-जवाब",
  "Live weather": "लाइव मौसम", "Cached weather": "सहेजा हुआ मौसम", "No current weather": "ताज़ा मौसम उपलब्ध नहीं",
  "Latest sound activity": "हाल में रिकॉर्ड की गई आवाज़", "Recorded signal, not ecosystem health": "रिकॉर्ड की गई आवाज़, पारिस्थितिकी स्वास्थ्य का माप नहीं",
  "No recording measured yet": "अभी कोई रिकॉर्डिंग नहीं मापी गई", "Saved records": "सहेजे हुए रिकॉर्ड", "Stored on this device": "इस डिवाइस पर सहेजे गए",
  "Crop guides": "फसल मार्गदर्शिकाएं", "North India reference windows": "उत्तर भारत के लिए संदर्भ समय",
  "Your next field tasks": "खेत के अगले काम", "No open tasks. Your next field check can be planned from an advisory answer or the calendar.": "कोई काम बाकी नहीं है। सलाह के जवाब या कैलेंडर से खेत का अगला काम जोड़ें।",
  "overdue tasks": "कामों की तारीख निकल चुकी है", "View all open tasks": "सभी बाकी काम देखें",
  Farm: "खेत", Due: "तारीख", planted: "बुवाई", Overdue: "तारीख निकल गई", Today: "आज", Upcoming: "आगामी", Completed: "पूरा",
  "Your farm tools": "आपके खेती के उपकरण",
  "Visible symptoms and the next field checks.": "दिख रहे लक्षण और खेत में अगली जांच।",
  "Plan your field": "खेत की योजना बनाएं", "layouts saved. Dimensions, rows, and irrigation.": "नक्शे सहेजे गए। माप, कतारें और सिंचाई।",
  "Check local weather": "स्थानीय मौसम देखें", "Location-specific forecast with dated observations.": "आपके स्थान का पूर्वानुमान और तारीख सहित मौसम के आंकड़े।",
  "Read your soil test": "मिट्टी की जांच समझें", "Measured values, explicit units, and soil context.": "जांच के मान, माप की इकाइयां और मिट्टी की जानकारी।",
  "Plan crop tasks": "फसल के काम तय करें", "Search growing windows and save dated tasks.": "फसल का सही समय खोजें और तारीख सहित काम सहेजें।",
  "Record field sound": "खेत की आवाज़ रिकॉर्ड करें", "Measure sound activity and review nearby records.": "आवाज़ की गतिविधि मापें और आस-पास के रिकॉर्ड देखें।",
  "Calculate field quantities": "खेती की मात्रा की गणना करें", "Area, seed quantity, water volume and pump time.": "क्षेत्रफल, बीज की मात्रा, पानी और पंप चलाने का समय।",
  "Track income & costs": "आय और खर्च लिखें", "Your crop transactions and recorded balance.": "फसल के लेन-देन और दर्ज किया हुआ हिसाब।",
  "JOITAFA is in pilot mode. Responses are AI-assisted and should be confirmed with local expert recommendations.": "JOITAFA अभी पायलट चरण में है। जवाब AI की सहायता से दिए जाते हैं। स्थानीय कृषि विशेषज्ञ से पुष्टि करें।",
  "Settings & offline data": "सेटिंग्स और ऑफलाइन डेटा", "Your farm profile, location, saved records, and service status.": "आपके खेत का विवरण, स्थान, सहेजे हुए रिकॉर्ड और सेवाओं की स्थिति।",
  "Dashboard language": "डैशबोर्ड की भाषा", "Default answer language": "जवाब की पसंदीदा भाषा",
  "Farm name": "खेत का नाम", "District / state": "जिला / राज्य", "Save profile": "विवरण सहेजें",
  "Farm profile saved.": "खेत का विवरण सहेज दिया गया।", "All farm tools": "खेती के सभी उपकरण",
};

export function useInterface() {
  const [preference, save] = useStored<{ language: InterfaceLanguage }>("joita-fa-interface", { language: "en" });
  const language = preference.language === "hi" ? "hi" : "en";
  return {
    language,
    setLanguage: (language: InterfaceLanguage) => save({ language }),
    t: (text: string) => language === "hi" ? hindi[text] || text : text,
  };
}
