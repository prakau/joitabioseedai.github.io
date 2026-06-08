import type { GroundedAnswerRequest } from "./geminiAdapter";

export async function requestHuggingFaceAnswerThroughBackend(_request: GroundedAnswerRequest) {
  throw new Error("Hugging Face Inference Providers require a backend proxy with HF_TOKEN. The browser app uses offline KB and optional Transformers.js instead.");
}
