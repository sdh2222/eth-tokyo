// Die Grotesk is licensed from Klim and may not sit in this public repo. The files live at the
// root of a private repo, and this script copies them into public/fonts/die-grotesk/ (ignored
// by git) before dev and build.
//
//   FONTS_TOKEN  a GitHub token with read access to that repo (Vercel env, or your shell)
//   FONTS_REPO   owner/name of that repo (default sdh2222/fonts)
//
// With the files already in place it does nothing. Without a token it warns and the page
// falls back to system-ui, so forks and CI still build. With a token, a failed download fails
// the build, so a deploy never ships without the face by accident.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const FILES = ["die-grotesk-c-regular.woff2", "die-grotesk-c-medium.woff2"];
const DIR = new URL("../public/fonts/die-grotesk/", import.meta.url);
const REPO = process.env.FONTS_REPO || "sdh2222/fonts";
const TOKEN = process.env.FONTS_TOKEN;

const missing = FILES.filter((file) => !existsSync(new URL(file, DIR)));
if (missing.length === 0) process.exit(0);

if (!TOKEN) {
  console.warn(`fonts: ${missing.join(", ")} not found and FONTS_TOKEN is not set, so Die Grotesk falls back to system-ui.`);
  process.exit(0);
}

mkdirSync(DIR, { recursive: true });
for (const file of missing) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${file}`, {
    headers: {
      Accept: "application/vnd.github.raw+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    console.error(`fonts: could not fetch ${file} from ${REPO} (HTTP ${response.status}).`);
    process.exit(1);
  }
  writeFileSync(new URL(file, DIR), Buffer.from(await response.arrayBuffer()));
  console.log(`fonts: fetched ${file}`);
}
