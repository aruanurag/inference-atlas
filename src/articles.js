import archive from "./content/article-index.json" with { type: "json" };

export const articles = archive.articles;
export const articleArchive = archive;
export function getArticle(id) {
  return articles.find((article) => article.id === id) || null;
}
export function articlesForLevel(level) {
  return articles.filter((article) => article.level === level);
}
const bodies = new Map();
export async function loadOriginalArticle(id) {
  if (!getArticle(id)) throw new Error("Unknown article");
  if (bodies.has(id)) return bodies.get(id);
  const response = await fetch(`/articles/${id}.json`);
  if (!response.ok)
    throw new Error(
      "The original article could not be loaded. Please try again.",
    );
  const original = await response.json();
  if (original.id !== id || !Array.isArray(original.blocks))
    throw new Error("Invalid source archive");
  bodies.set(id, original);
  return original;
}
