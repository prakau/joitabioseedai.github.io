import { test } from "node:test";
import assert from "node:assert/strict";
import { readChatStream, type ChatProgress } from "../src/lib/network";
import {
  resolveAnswerLanguage,
  advisoryLanguageHelp,
  answerLanguages,
} from "../src/lib/languages";

test("automatic language matching covers native scripts while explicit dialects win", () => {
  for (const [text, language] of [
    ["सरसों में कीड़े हैं", "Hindi"],
    ["ਕਣਕ ਦੇ ਪੱਤੇ", "Punjabi"],
    ["தக்காளி இலைகள்", "Tamil"],
    ["టమాటా ఆకులు", "Telugu"],
    ["পাত হলুদ", "Bengali"],
    ["আপোনাৰ পথাৰত", "Assamese"],
    ["ٹماٹر کے پتے", "Urdu"],
    ["meri fasal kaise bachau", "Hindi"],
  ])
    assert.equal(resolveAnswerLanguage("Auto", text), language);
  assert.equal(
    resolveAnswerLanguage("Marathi", "पाने पिवळी पडत आहेत"),
    "Marathi",
  );
  assert.equal(resolveAnswerLanguage("Haryanvi", "सरसों"), "Haryanvi");
  assert.equal(resolveAnswerLanguage("Auto", "yes", "Tamil"), "Tamil");
  assert.equal(resolveAnswerLanguage("English", "ਟਮਾਟਰ"), "English");
  for (const language of answerLanguages)
    assert(advisoryLanguageHelp(language.name).example.length > 20);
});

function stream(events: [string, unknown][]) {
  const bytes = new TextEncoder().encode(
    events
      .map(
        ([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`,
      )
      .join(""),
  );
  return new Response(
    new ReadableStream({
      start(c) {
        for (let i = 0; i < bytes.length; i += 5)
          c.enqueue(bytes.slice(i, i + 5));
        c.close();
      },
    }),
  );
}
test("client decodes fragmented native text, resets failed partials and requires final completion", async () => {
  const events: ChatProgress[] = [];
  const answer = "पत्तियों के नीचे कीट देखें। मिट्टी की नमी जांचें।";
  const result = await readChatStream(
    stream([
      ["status", { provider: "gemini", message: "Connecting" }],
      ["delta", { text: "unfinished" }],
      ["reset", { provider: "openrouter", message: "Trying fallback" }],
      ["delta", { text: answer }],
      ["complete", { ok: true, source: "openrouter", answer, model: "test" }],
    ]),
    (e) => events.push(e),
  );
  assert.equal(result.answer, answer);
  assert.equal(events[2].type, "reset");
  await assert.rejects(
    () => readChatStream(stream([["delta", { text: answer }]]), () => {}),
    /interrupted before it finished/,
  );
  await assert.rejects(
    () =>
      readChatStream(
        stream([
          ["complete", { ok: false, source: "gemini", answer, model: "test" }],
        ]),
        () => {},
      ),
    /invalid answer/,
  );
});

test("client forwards partial text before the response finishes", async () => {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const response = new Response(
    new ReadableStream({
      start(c) {
        controller = c;
      },
    }),
  );
  const events: ChatProgress[] = [];
  const result = readChatStream(response, (e) => events.push(e));
  const encode = (event: string, data: unknown) =>
    new TextEncoder().encode(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
    );
  controller!.enqueue(encode("delta", { text: "First real chunk" }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "delta");
  controller!.enqueue(
    encode("complete", {
      ok: true,
      source: "gemini",
      answer: "First real chunk and the complete practical answer.",
      model: "test",
    }),
  );
  controller!.close();
  assert.equal((await result).source, "gemini");
});
