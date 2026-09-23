const chemical = /pesticid|insecticid|fungicid|herbicid|imidacloprid|chlorpyrifos|urea|fertili[sz]er|कीटनाशक|फफूंदनाशक|खरपतवारनाशक|यूरिया|उर्वरक|दवा/iu;
const quantity = /[0-9०-९]+(?:[.,][0-9०-९]+)?\s*(?:ml|mg|g|kg|lit(?:re|er)s?|मिलीलीटर|मिली|ग्राम|किलो|लीटर)(?=$|[\s/,.।])/iu;

export function requestPolicy(message) {
  if (chemical.test(message) && /dosage|dose|mix|double|कितन|डोज|मात्रा|मिलाकर|मिलाएं|दोगुन/iu.test(message)) return "chemical_safety";
  if (/write (?:a )?(?:python|javascript|malware)|stock (?:tips|picks)|cryptocurrency trading|राजनीतिक भाषण|reveal.*(?:system prompt|api key)/iu.test(message)) return "farm_scope";
  return null;
}

// A conservative output screen supplements the model policy, not a clinical/agronomic validation.
export function answerPolicy(answer) {
  for (const sentence of answer.split(/\n|।|[.!?](?=\s|$)/u)) {
    if (chemical.test(sentence) && quantity.test(sentence)) return "chemical_safety";
    if (!/नहीं|cannot|not reliable|does not/iu.test(sentence) && /(?:ऊपर|नीचे).{0,35}(?:मुड़|मुड).{0,100}(?:वायरस|कीट|कमी|होता|संकेत)|(?:upward|downward).{0,35}curl.{0,100}(?:virus|deficien|indicat|caused|means)/iu.test(sentence)) return "diagnosis_limit";
  }
  const claims = answer.replace(/(?:यह\s+)?पक्का निदान\s+नहीं(?:\s+है)?/gu, "");
  if (/guarantee(?:d|s)? (?:a |the )?(?:yield|pest|disease)|100\s*%\s*(?:safe|effective|cure)|definitely (?:has|is) (?:blight|virus)|पक्का निदान|उपज की गारंटी/iu.test(claims)) return "unsupported_claim";
  return null;
}

export function policyReply(reason, language) {
  const hi = ["Hindi", "Haryanvi"].includes(language);
  if (reason === "diagnosis_limit") return hi
    ? "**पत्ती मुड़ने की दिशा से अकेले कारण तय नहीं होता।**\n\nआज प्रभावित और स्वस्थ पौधों की तुलना करें। पत्तियों के नीचे छोटे कीट या अंडे देखें, जड़ों के पास मिट्टी की नमी और जल निकासी जांचें, और नोट करें कि लक्षण पुरानी पत्तियों पर हैं या नई पत्तियों पर। हाल में किए गए छिड़काव और सिंचाई का रिकॉर्ड रखें।\n\nबिना कारण की पुष्टि के दवा या खाद न डालें। यदि लक्षण तेजी से फैल रहे हों, पूरा पौधा मुरझाए या नई बढ़वार रुक रही हो, तो फोटो और खेत के रिकॉर्ड के साथ स्थानीय KVK या कृषि विशेषज्ञ से जांच कराएं।\n\nलक्षण कब शुरू हुए और लगभग कितने पौधे प्रभावित हैं?"
    : "Leaf-curl direction alone cannot establish the cause. Compare affected and healthy plants, inspect leaf undersides for insects or eggs, check root-zone moisture and drainage, and note whether old or new leaves are affected. Record recent irrigation and sprays. Do not add pesticides or fertilizer before confirming the cause. Seek local KVK advice if symptoms spread quickly, whole plants wilt or new growth stops. When did symptoms start, and how many plants are affected?";
  if (reason === "farm_scope") return hi
    ? "मैं JOITA का खेती सहायक हूं। फसल, मिट्टी, सिंचाई, मौसम, मंडी या खेत के हिसाब से जुड़ा सवाल पूछें। आप किस फसल पर काम कर रहे हैं?"
    : "I am JOITA's farming assistant. I can help with crops, soil, irrigation, weather, mandi records and farm calculations. Which crop or field question would you like help with?";
  return hi
    ? "**दवा या खाद की मात्रा की पुष्टि ज़रूरी है।**\n\nफोटो या लक्षण देखकर दवा, खाद की मात्रा या टैंक-मिश्रण बताना सुरक्षित नहीं है। केवल उस फसल के लिए स्वीकृत उत्पाद के लेबल और स्थानीय KVK या कृषि विशेषज्ञ से पुष्टि के बाद उपयोग करें। मात्रा दोगुनी न करें और बिना पुष्टि उत्पाद न मिलाएं।\n\nअभी प्रभावित और स्वस्थ पौधों की पत्तियां, मिट्टी की नमी और कीट देखें। बिना कारण की पुष्टि के नया छिड़काव न करें।\n\nकौन सी फसल है और उत्पाद के लेबल पर सक्रिय तत्व व सांद्रता क्या लिखी है?"
    : "**Confirm the product label before using chemicals or fertilizer.**\n\nA photo or symptoms alone cannot establish a safe dose or tank mix. Use only a product approved for the crop and confirm its label with your local KVK or agriculture expert. Do not double the dose or mix products without confirmation.\n\nCompare affected and healthy plants, leaf undersides and soil moisture before adding an input. Which crop, active ingredient and formulation are on the product label?";
}
