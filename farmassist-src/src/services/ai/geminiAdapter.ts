export type GroundedAnswerRequest = {
  question: string;
  joitaKbContext: string[];
  weatherContext?: string;
  soilContext?: string;
  marketContext?: string;
};

export async function requestGeminiAnswerThroughBackend(_request: GroundedAnswerRequest) {
  throw new Error("Gemini must be called through a backend proxy. Do not expose Gemini API keys in GitHub Pages frontend code.");
}
