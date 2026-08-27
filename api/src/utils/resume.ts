export function genererResumeExtractif(description: string | null, titre: string): string {
    if (!description || description.trim().length === 0) return titre;
    const phrases = description.match(/[^.!?]+[.!?]+/g) ?? [description];
    return phrases.slice(0, 2).join(" ").trim();
}