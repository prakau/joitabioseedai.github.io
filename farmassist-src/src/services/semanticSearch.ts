import { cropGuides } from "../data/agriculture";
import { scoreFromText } from "../lib/utils";

export type KbMatch = {
  source: string;
  text: string;
  score: number;
  mode: "keyword" | "semantic";
};

const chunks = cropGuides.map((crop) => ({
  source: crop.crop,
  text: `${crop.crop}. Season ${crop.season}. Sowing ${crop.sowing}. Irrigation ${crop.water}. Fertilizer ${crop.fertilizer}. Pests and diseases ${crop.pests.join(", ")}. Weather stress ${crop.stress}. Harvest ${crop.harvest}. Economics ${crop.economics}.`
}));

export async function searchKnowledgeBase(query: string): Promise<KbMatch[]> {
  const keyword = chunks
    .map((chunk) => ({ ...chunk, score: scoreFromText(query, chunk.text.split(/\W+/).filter((word) => word.length > 3)), mode: "keyword" as const }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (localStorage.getItem("joita-fa-enable-transformers") !== "true") {
    return keyword;
  }

  try {
    const { pipeline } = await import("@huggingface/transformers");
    const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    const queryEmbedding = await extractor(query, { pooling: "mean", normalize: true });
    const queryVector = Array.from(queryEmbedding.data as Iterable<number>);
    const semantic = [];
    for (const chunk of chunks) {
      const vector = await extractor(chunk.text, { pooling: "mean", normalize: true });
      const values = Array.from(vector.data as Iterable<number>);
      semantic.push({ ...chunk, score: cosine(queryVector, values), mode: "semantic" as const });
    }
    return semantic.sort((a, b) => b.score - a.score).slice(0, 4);
  } catch {
    return keyword;
  }
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    magA += a[index] * a[index];
    magB += b[index] * b[index];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}
