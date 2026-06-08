import { safeJsonParse } from "./utils";

export type CommunityPost = {
  id: string;
  author: string;
  village: string;
  text: string;
  createdAt: string;
};

const POSTS_KEY = "joita-farmassist-posts";
const NOTES_KEY = "joita-farmassist-notes";

export function getPosts(): CommunityPost[] {
  return safeJsonParse<CommunityPost[]>(localStorage.getItem(POSTS_KEY), [
    {
      id: "seed-1",
      author: "Sushila",
      village: "Sehore",
      text: "Neem spray reduced whitefly after two evening applications. Also adding yellow traps near cotton border.",
      createdAt: "2026-06-01"
    },
    {
      id: "seed-2",
      author: "Ravi",
      village: "Wardha",
      text: "Rice nursery survived a network outage because we kept sowing notes offline and synced later.",
      createdAt: "2026-06-03"
    }
  ]);
}

export function savePost(post: Omit<CommunityPost, "id" | "createdAt">) {
  const next = [
    { ...post, id: crypto.randomUUID(), createdAt: new Date().toISOString().slice(0, 10) },
    ...getPosts()
  ];
  localStorage.setItem(POSTS_KEY, JSON.stringify(next));
  return next;
}

export function getNotes() {
  return safeJsonParse<string[]>(localStorage.getItem(NOTES_KEY), []);
}

export function saveNote(note: string) {
  const next = [note, ...getNotes()].slice(0, 20);
  localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  return next;
}
