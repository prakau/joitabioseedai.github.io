import { bioSpecies, cropGuides, diseaseRules, seasonalFallback } from "../data/agriculture";
import { scoreFromText } from "./utils";

export function answerFarmQuestion(question: string) {
  const clean = question.trim();
  if (!clean) return "Ask about a crop, fertilizer, pest, soil, irrigation, market planning, or biochar practice.";

  const ranked = cropGuides
    .map((guide) => ({
      guide,
      score: scoreFromText(clean, [...guide.keywords, ...guide.pests, guide.season])
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (top.score > 0) {
    return `${top.guide.crop}: sow ${top.guide.sowing}; harvest ${top.guide.harvest}. Water guidance: ${top.guide.water} Fertilizer: ${top.guide.fertilizer} Watch for ${top.guide.pests.join(", ")}.`;
  }

  const lower = clean.toLowerCase();
  if (lower.includes("fert")) {
    return "Use soil-test-led fertilizer. For most crops, apply compost or FYM before sowing, phosphorus and potassium basally, and nitrogen in split doses to reduce loss.";
  }
  if (lower.includes("pest") || lower.includes("insect")) {
    return "Start with field scouting: count affected plants, check leaf undersides, identify beneficial insects, use traps, and spray only after local threshold advice is met.";
  }
  if (lower.includes("soil")) {
    return "Healthy soil should hold moisture, drain excess water, and show biological activity. Add compost, rotate legumes, reduce deep tillage, and test pH/NPK once per season.";
  }
  if (lower.includes("biochar")) {
    return "Charge biochar with compost, slurry, or urine before application. Start with small plots, mix into topsoil, and track crop response before scaling.";
  }

  return "FarmAssist offline answer: describe the crop, visible symptom, field age, soil type, and recent weather. I can then narrow advice for irrigation, pest, disease, fertilizer, or harvest timing.";
}

export function diagnosePlant(fileName: string, notes: string) {
  const source = `${fileName} ${notes}`;
  const ranked = diseaseRules
    .map((rule) => ({ rule, score: scoreFromText(source, rule.cues) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const confidence = Math.min(92, 58 + top.score * 12);

  if (top.score === 0) {
    return {
      label: "General crop stress check",
      confidence: 52,
      advice: "Image metadata and notes do not show strong disease cues. Check recent irrigation, root zone moisture, pest presence under leaves, and compare with healthy plants nearby."
    };
  }

  return {
    label: top.rule.name,
    confidence,
    advice: top.rule.advice
  };
}

export function estimateBioacoustics(seconds: number, ambient: number) {
  const recordingScore = Math.min(1, seconds / 60);
  const noisePenalty = Math.max(0, (ambient - 55) / 45);
  const diversity = bioSpecies.map((species, index) => ({
    ...species,
    detected: Math.max(0, Math.round(species.value * recordingScore - noisePenalty * 6 + index * 2))
  }));
  const ehi = Math.max(18, Math.min(96, Math.round(48 + recordingScore * 38 - noisePenalty * 22 + diversity.length * 2)));
  return {
    ehi,
    diversity,
    summary: ehi > 72 ? "High field biodiversity signal" : ehi > 50 ? "Moderate ecosystem activity" : "Low activity or noisy recording"
  };
}

export function seasonalWeatherFallback(month = new Date().getMonth()) {
  if (month >= 5 && month <= 8) return seasonalFallback.monsoon;
  if (month >= 2 && month <= 4) return seasonalFallback.summer;
  return seasonalFallback.winter;
}
