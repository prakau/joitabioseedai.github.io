import { cropGuides } from "../data/agriculture";
import { inferCrop } from "../services/semanticSearch";
export function answerFarmQuestion(
  question: string,
  selectedCrop = "",
  stage = "",
) {
  const crop = inferCrop(question, selectedCrop);
  const guide = cropGuides.find((item) => item.crop === crop);
  const text = question.toLowerCase();
  const heading = crop
    ? `**${crop}${stage && stage !== "not sure" ? ` / ${stage}` : ""}**\n\n`
    : "";
  const safety =
    "\n\nThese are general checks, not a confirmed diagnosis. Confirm pesticide and fertilizer decisions with your local KVK and the approved crop label.";
  if (/^(hi|hello|hey|namaste)[\s.!?]*$/i.test(question.trim()))
    return `Hello! I can help with crop symptoms, irrigation, soil tests, and planting. ${crop ? `For your ${crop.toLowerCase()}, ` : "To begin, "}tell me what you see in the field and how long it has been happening.`;
  if (/price|mandi|sell|market/.test(text))
    return (
      heading +
      "I cannot quote a current mandi price from the offline database. Open Market to check dated AGMARKNET records. Compare the same market, variety, grade, arrival date, and rupees per quintal before deciding to sell."
    );
  if (/weather|forecast|rain tomorrow|temperature today/.test(text))
    return (
      heading +
      "Offline knowledge cannot tell today's temperature or tomorrow's rainfall. Open Weather, choose your location, and check the source and observation time. Do not schedule spraying from seasonal averages."
    );
  if (/curl|yellow|whitefl|aphid|white insect|thrips|mite/.test(text)) {
    const detail =
      crop === "Mustard"
        ? "Inspect the flowering shoots and undersides of leaves for aphid colonies, sticky honeydew, and beneficial insects. Record how many plants are affected across several parts of the field."
        : crop === "Tomato"
          ? "Inspect young curled leaves and their undersides for whiteflies, thrips, and mites. Leaf-curl viruses, water stress, herbicide injury, and nutrient problems can look similar; a photo alone cannot confirm a virus."
          : `Inspect ${crop ? crop.toLowerCase() : "the crop"} leaves on both sides for insects, sticky deposits, uneven yellowing, and distorted new growth.`;
    return (
      heading +
      `**Check today**\n${detail}\n\n**Before treatment**\nCompare affected and healthy plants. Check root-zone moisture and drainage; note recent spraying and whether the issue is spreading. Photograph the whole plant and a close leaf view. Avoid adding fertilizer or spraying until the cause is clearer.` +
      safety
    );
  }
  if (/spot|blight|rot|wilt|disease|fung|powder/.test(text))
    return (
      heading +
      "**Check the pattern**\nRecord spots, growth on the leaf, wilting, and whether roots are wet or damaged. Compare older and younger leaves. Several diseases and water stresses share these symptoms.\n\n**Immediate checks**\nInspect drainage and irrigation, avoid moving soil or tools from affected patches without cleaning, and bring clear photographs to a KVK if symptoms spread. Do not select a chemical from leaf colour alone." +
      safety
    );
  if (/irrig|water|dry|heat|drought/.test(text))
    return (
      heading +
      `**Water and stress**\n${guide?.water || "Check root-zone moisture before irrigating; soil texture, rooting depth, rainfall, and crop stage change water needs."}\n\n${guide?.stress || "Check drainage and compare shaded and exposed parts of the field."}\n\nUse actual soil moisture and a dated forecast. I cannot infer a fixed irrigation volume from the question alone.`
    );
  if (/fert|nutri|nitrogen|urea|npk|phosph|potass/.test(text))
    return (
      heading +
      `**Nutrient planning**\n${guide?.fertilizer || "Use a laboratory soil test and the crop's local fertilizer recommendation."}\n\nA dose needs the field area, soil-test units, product composition, crop stage, and local recommendation. Avoid adding micronutrients based only on yellowing.` +
      safety
    );
  if (/sow|plant|harvest|calendar|season/.test(text) && guide)
    return (
      heading +
      `**Typical North India window**\nSowing: ${guide.sowing}.\n${guide.transplanting ? `Transplanting: ${guide.transplanting}.\n` : ""}Harvest: ${guide.harvest}.\n\nStages: ${guide.stages.join(" -> ")}.\n\nThese are regional guide windows, not dates confirmed for your variety or this season. Check local extension guidance.`
    );
  if (/soil|ph|salin|organic carbon/.test(text))
    return (
      heading +
      "Enter your laboratory soil values and units in Soil. pH describes acidity, EC describes soluble salts, and organic carbon is a separate measurement. Sampling and test method matter; a sensor reading is not interchangeable with every laboratory test. Lime, gypsum, and fertilizer amounts need a local soil recommendation."
    );
  if (guide)
    return (
      heading +
      `What specifically would you like to check: symptoms, irrigation, nutrients, or planting?\n\nFor ${guide.crop.toLowerCase()}, a useful first check is: ${guide.water}\n${guide.stress}\n\nShare the symptom, when it started, and how much of the field is affected.`
    );
  return "I do not have a reliable offline answer for that question. Tell me the crop and the specific symptom or farming decision. Use live AI for a broader question, or contact contact@joitabioseedai.com for expert follow-up.";
}
