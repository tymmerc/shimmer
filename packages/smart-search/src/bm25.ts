/**
 * BM25 search engine — custom implementation with FR/EN stopwords.
 * Target: <10ms for 1000 documents.
 */

const STOP_WORDS_FR = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'au', 'aux',
  'à', 'ce', 'ces', 'dans', 'pour', 'par', 'sur', 'avec', 'est', 'sont', 'son',
  'sa', 'ses', 'qui', 'que', 'ne', 'pas', 'plus', 'ou', 'se', 'il', 'elle',
  'nous', 'vous', 'ils', 'elles', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
  'notre', 'votre', 'leur', 'leurs', 'je', 'tu', 'on', 'me', 'te', 'lui',
  'y', 'ci', 'ça', 'été', 'être', 'avoir', 'fait', 'très', 'tout', 'tous',
  'même', 'aussi', 'mais', 'donc', 'car', 'ni', 'si', 'bien', 'où', 'quand',
  'comme', 'cette', 'cet', 'ceux', 'celles', 'dont', 'peu', 'trop', 'ici',
]);

const STOP_WORDS_EN = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him',
  'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'not', 'no',
  'so', 'if', 'as', 'from', 'up', 'out', 'about', 'into', 'over', 'after',
]);

const STOP_WORDS = new Set([...STOP_WORDS_FR, ...STOP_WORDS_EN]);

// BM25 parameters
const K1 = 1.5;
const B = 0.75;

interface BM25Document {
  id: number;
  terms: string[];
  termFreqs: Map<string, number>;
  length: number;
}

export interface BM25Hit {
  id: number;
  score: number;
}

export class BM25Index {
  private documents: BM25Document[] = [];
  private idf: Map<string, number> = new Map();
  private avgDocLength = 0;
  private docCount = 0;

  static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  }

  build(docs: { id: number; text: string }[]): void {
    this.documents = [];
    this.idf = new Map();
    const df = new Map<string, number>();

    for (const doc of docs) {
      const terms = BM25Index.tokenize(doc.text);
      const termFreqs = new Map<string, number>();
      for (const t of terms) {
        termFreqs.set(t, (termFreqs.get(t) || 0) + 1);
      }

      this.documents.push({
        id: doc.id,
        terms,
        termFreqs,
        length: terms.length,
      });

      // Document frequency
      for (const t of new Set(terms)) {
        df.set(t, (df.get(t) || 0) + 1);
      }
    }

    this.docCount = docs.length;
    this.avgDocLength =
      this.documents.reduce((sum, d) => sum + d.length, 0) / (this.docCount || 1);

    // IDF = ln((N - df + 0.5) / (df + 0.5) + 1)
    for (const [term, freq] of df) {
      this.idf.set(
        term,
        Math.log((this.docCount - freq + 0.5) / (freq + 0.5) + 1),
      );
    }
  }

  search(query: string, topK = 20): BM25Hit[] {
    const queryTerms = BM25Index.tokenize(query);
    if (queryTerms.length === 0) return [];

    const scores: { id: number; score: number }[] = [];

    for (const doc of this.documents) {
      let score = 0;
      for (const qt of queryTerms) {
        const tf = doc.termFreqs.get(qt) || 0;
        if (tf === 0) continue;
        const idf = this.idf.get(qt) || 0;
        const tfNorm =
          (tf * (K1 + 1)) /
          (tf + K1 * (1 - B + B * (doc.length / this.avgDocLength)));
        score += idf * tfNorm;
      }
      if (score > 0) {
        scores.push({ id: doc.id, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }

  /** Serialize index for disk persistence. */
  serialize(): string {
    return JSON.stringify({
      documents: this.documents.map((d) => ({
        id: d.id,
        terms: d.terms,
        termFreqs: Array.from(d.termFreqs.entries()),
        length: d.length,
      })),
      idf: Array.from(this.idf.entries()),
      avgDocLength: this.avgDocLength,
      docCount: this.docCount,
    });
  }

  /** Deserialize index from disk. */
  static deserialize(json: string): BM25Index {
    const data = JSON.parse(json);
    const index = new BM25Index();
    index.documents = data.documents.map((d: any) => ({
      id: d.id,
      terms: d.terms,
      termFreqs: new Map(d.termFreqs),
      length: d.length,
    }));
    index.idf = new Map(data.idf);
    index.avgDocLength = data.avgDocLength;
    index.docCount = data.docCount;
    return index;
  }

  get size(): number {
    return this.docCount;
  }
}
