// Draws media/social-preview.png, the GitHub social preview (repo Settings → General → Social
// preview; GitHub has no API for it, so upload it by hand). Everything on the card is the kit's
// own output: the banner, and a sequence diagram of how the kit is used.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { renderBanner } from "../extension/src/lib/banner";
import { renderSequence } from "../extension/src/lib/sequence";

const TAGLINE = "For when formatting isn't enough and a drawing is too much";
const STORY = ["You -> Raycast: select a list, ⌃⌥A", "Raycast --> You: pick a format", "You -> Code block: paste"];

const banner = renderBanner("ASCII Kit", { size: "tall" });
const card = [banner, "", TAGLINE, "", "", renderSequence(STORY.join("\n"))].join("\n");

const input = join(mkdtempSync(join(tmpdir(), "ascii-kit-social-")), "card.txt");
writeFileSync(input, card);
const out = resolve(__dirname, "../media/social-preview.png");
const accentLines = banner.split("\n").length;
execFileSync("swift", [resolve(__dirname, "render-card.swift"), input, out, "dark", String(accentLines)], {
  stdio: "inherit",
});
