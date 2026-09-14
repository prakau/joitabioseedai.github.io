import { cropGuides } from "../data/agriculture";
const aliases: Record<string, string> = {
  paddy: "rice",
  dhan: "rice",
  gehun: "wheat",
  sarson: "mustard",
  tamatar: "tomato",
  pyaz: "onion",
  aloo: "potato",
  chana: "chickpea",
  bhindi: "okra",
  lauki: "bottle gourd",
  karela: "bitter gourd",
  makka: "maize",
  धान: "rice",
  चावल: "rice",
  गेहूं: "wheat",
  गेहूँ: "wheat",
  सरसों: "mustard",
  टमाटर: "tomato",
  प्याज: "onion",
  आलू: "potato",
  चना: "chickpea",
  भिंडी: "okra",
  लौकी: "bottle gourd",
  करेला: "bitter gourd",
  मक्का: "maize",
  कपास: "cotton",
  मिर्च: "chilli",
  ਕਣਕ: "wheat",
  ਝੋਨਾ: "rice",
  ਸਰ੍ਹੋਂ: "mustard",
  ਟਮਾਟਰ: "tomato",
  ਆਲੂ: "potato",
  तांदूळ: "rice",
  गहू: "wheat",
  कांदा: "onion",
  बटाटा: "potato",
  ઘઉં: "wheat",
  ડાંગર: "rice",
  ટામેટા: "tomato",
  કપાસ: "cotton",
  ধান: "rice",
  গম: "wheat",
  টমেটো: "tomato",
  আলু: "potato",
  தக்காளி: "tomato",
  நெல்: "rice",
  வெங்காயம்: "onion",
  టమాటా: "tomato",
  వరి: "rice",
  మొక్కజొన్న: "maize",
  ಟೊಮೇಟೊ: "tomato",
  ಭತ್ತ: "rice",
  തക്കാളി: "tomato",
  നെല്ല്: "rice",
  ଧାନ: "rice",
  ٹماٹر: "tomato",
  گندم: "wheat",
  چاول: "rice",
};
const stopWords = new Set([
  "what",
  "when",
  "where",
  "which",
  "should",
  "please",
  "check",
  "crop",
  "grow",
  "have",
  "with",
  "from",
  "that",
  "this",
  "about",
  "their",
  "could",
  "would",
]);
export function searchCrops(query: string) {
  const words =
    query
      .normalize("NFC")
      .toLowerCase()
      .match(/[\p{L}\p{M}\p{N}]+/gu) || [];
  const tokens = [
    ...new Set(
      words
        .map((w) => aliases[w] || w)
        .filter((w) => w.length > 2 && !stopWords.has(w)),
    ),
  ];
  if (!query.trim()) return cropGuides;
  if (!tokens.length) return [];
  return cropGuides
    .map((guide) => {
      const name = guide.crop.toLowerCase();
      const text =
        `${guide.keywords.join(" ")} ${guide.pests.join(" ")} ${guide.water} ${guide.fertilizer}`.toLowerCase();
      const score = tokens.reduce(
        (sum, token) =>
          sum + (name.includes(token) ? 20 : text.includes(token) ? 1 : 0),
        0,
      );
      return { guide, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.guide);
}
export function inferCrop(question: string, selected = "") {
  const lower = question.normalize("NFC").toLowerCase();
  const candidates = cropGuides
    .flatMap((guide) =>
      [
        guide.crop.toLowerCase(),
        ...Object.keys(aliases).filter(
          (key) => aliases[key] === guide.crop.toLowerCase(),
        ),
      ].map((name) => ({ name, crop: guide.crop })),
    )
    .sort((a, b) => b.name.length - a.name.length);
  return (
    candidates.find(({ name }) =>
      new RegExp(
        `(^|[^\\p{L}\\p{M}\\p{N}])${name}([^\\p{L}\\p{M}\\p{N}]|$)`,
        "u",
      ).test(lower),
    )?.crop || selected
  );
}
