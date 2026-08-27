import fs from "fs/promises";

type VectorizerData = {
    vocabulary: Record<string, number>;
    idf: number[];
    max_features: number;
};

export class TfidfService {
    private vocabulary: Record<string, number> = {};
    private idf: number[] = [];
    private maxFeatures = 0;

    async load(vectorizerPath: string) {
        const raw = await fs.readFile(vectorizerPath, "utf-8");
        const data = JSON.parse(raw) as VectorizerData;
        this.vocabulary = data.vocabulary;
        this.idf = data.idf;
        this.maxFeatures = data.max_features;
    }

    private tokenize(texte: string): string[] {
        return texte.toLowerCase().match(/\b[\p{L}]+\b/gu)?.filter((tok) => tok.length > 1) ?? [];
    }

    transform(texte: string): Float32Array {
        const vecteur = new Float32Array(this.maxFeatures);
        const tokens = this.tokenize(texte);

        const termFreq = new Map<number, number>();
        for (const token of tokens) {
            const index = this.vocabulary[token];
            if (index !== undefined) termFreq.set(index, (termFreq.get(index) ?? 0) + 1);
        }

        for (const [index, freq] of termFreq) {
            vecteur[index] = freq * this.idf[index];
        }

        let normeCarree = 0;
        for (let i = 0; i < vecteur.length; i++) normeCarree += vecteur[i] * vecteur[i];
        const norme = Math.sqrt(normeCarree);
        if (norme > 0) for (let i = 0; i < vecteur.length; i++) vecteur[i] /= norme;

        return vecteur;
    }
}