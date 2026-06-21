function splitSentences(narrative: string) {
  return narrative.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map((sentence) => sentence.trim()) ?? [narrative.trim()];
}

export function splitReflectionNarrative(narrative: string) {
  const sentences = splitSentences(narrative).filter(Boolean);

  if (sentences.length <= 2) return sentences;

  return [
    sentences.slice(0, 2).join(" "),
    ...sentences.slice(2, 5),
  ].slice(0, 4);
}
