// Regenerates the example galleries in README.md (this repo) and extension/README.md (the Store
// page) from the real generators and data, so they can't drift from what the extension draws.
// Only the text between `<!-- gen:NAME -->` and `<!-- /gen:NAME -->` markers is rewritten.
// `--check` exits 1 instead of writing if either is stale.
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { ALL_GLYPHS, GROUPS, Glyph } from "../extension/src/data/glyphs";
import { TEMPLATES, TEMPLATE_GROUPS } from "../extension/src/data/templates";
import { renderBanner } from "../extension/src/lib/banner";
import { EXPECTS, FORMATS, KIND_TITLES, Kind } from "../extension/src/lib/formats";
import { sideBySide } from "../extension/src/lib/layout";
import { fence } from "../extension/src/lib/markdown";
import { displayWidth } from "../extension/src/lib/width";
import { SAMPLES } from "./samples";

const READMES: { path: string; sections: string[] }[] = [
  {
    path: resolve(__dirname, "../README.md"),
    sections: ["hero", "counts", "showcase", "formats", "glyphs", "templates"],
  },
  { path: resolve(__dirname, "../extension/README.md"), sections: ["storeCounts", "showcase", "inputs"] },
];
const WALL_WIDTH = 76;

const format = (id: string) => {
  const f = FORMATS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown format ${id}`);
  return f;
};
const kinds = [...new Set(FORMATS.map((f) => f.kind))];
const details = (summary: string, body: string) => `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Input on the left, the chosen format's output on the right. */
function pair(input: string, formatId: string): string {
  return sideBySide([input, format(formatId).render(input)], "   →   ");
}

const SHOWCASE: { caption: string; input: string; format: string }[] = [
  {
    caption: "An indented list becomes a tree. Text after two spaces lines up as a note.",
    input: "Page\n  Header  sticky\n    Logo\n    Account menu\n  Results  paged\n    Result card\n    Pagination",
    format: "tree-rounded",
  },
  {
    caption: "`A -> B: label` lines become a sequence diagram.",
    input: SAMPLES.sequence,
    format: "sequence",
  },
  {
    caption: "`label value` rows become a chart.",
    input: "Design 40\nBuild 29\nQA 12.5\nLaunch 3",
    format: "chart-bars",
  },
];

const sections: Record<string, () => string> = {
  hero: () => fence(renderBanner("ASCII Kit", { size: "tall" })),

  counts: () => {
    const snippets = ALL_GLYPHS.filter((g) => g.keyword).length;
    return [
      `**${FORMATS.length} formats** in ${kinds.length} kinds`,
      `**${ALL_GLYPHS.length} glyphs** in ${GROUPS.length} groups`,
      `**${TEMPLATES.length} templates** in ${TEMPLATE_GROUPS.length} sections`,
      `**${snippets} snippets**`,
    ].join(" · ");
  },

  // The Store page has no snippet pack: snippets can't ship with an extension.
  storeCounts: () =>
    [
      `**${FORMATS.length} formats** in ${kinds.length} kinds`,
      `**${ALL_GLYPHS.length} glyphs** in ${GROUPS.length} groups`,
      `**${TEMPLATES.length} templates** in ${TEMPLATE_GROUPS.length} sections`,
    ].join(" · "),

  inputs: () =>
    [
      "| Kind | Write this | Formats |",
      "| --- | --- | --- |",
      ...kinds.map((kind: Kind) => {
        const formats = FORMATS.filter((f) => f.kind === kind).map((f) => f.title.replace(/^[^·]+·\s*/, ""));
        const cell = (text: string) => text.replace(/\|/g, "\\|");
        return `| ${KIND_TITLES[kind]} | ${cell(EXPECTS[kind])} | ${cell(formats.join("; "))} |`;
      }),
    ].join("\n"),

  showcase: () => SHOWCASE.map((s) => `${s.caption}\n\n${fence(pair(s.input, s.format))}`).join("\n\n"),

  formats: () =>
    kinds
      .map((kind: Kind) => {
        const formats = FORMATS.filter((f) => f.kind === kind);
        const body = [
          `Write ${EXPECTS[kind]}. For example:`,
          fence(SAMPLES[kind]),
          ...formats.map((f) => `**${f.title}**\n\n${fence(f.render(SAMPLES[kind]))}`),
        ].join("\n\n");
        return details(`<b>${KIND_TITLES[kind]}</b> · ${formats.length} formats`, body);
      })
      .join("\n"),

  glyphs: () => {
    const isInline = (g: Glyph) => !g.text.includes("\n") && !g.frames;
    const label = 18;
    const rows = GROUPS.map((group) => {
      // Spinners show as their frame strip; single-character frames only, so the strip reads.
      const items = group.glyphs.some((g) => g.frames)
        ? group.glyphs.filter((g) => g.frames!.every((f) => displayWidth(f) === 1)).map((g) => g.frames!.join(""))
        : group.glyphs.filter(isInline).map((g) => g.text.trimEnd());
      const lines: string[] = [];
      let line = group.title.padEnd(label);
      let first = true;
      for (const item of items) {
        if (!first && displayWidth(line) + 3 + displayWidth(item) > WALL_WIDTH) {
          lines.push(line);
          line = " ".repeat(label);
          first = true;
        }
        line += (first ? "" : "   ") + item;
        first = false;
      }
      lines.push(line);
      return lines.join("\n");
    });
    const bigArrows = ["Heavy, down", "Chevron, right", "Outline, right", "Solid, right", "Outline, down"].map(
      (name) => {
        const g = GROUPS.flatMap((x) => x.glyphs).find((x) => x.name === name);
        if (!g) throw new Error(`Unknown glyph ${name}`);
        return g.text;
      },
    );
    const table = [
      "| Group | What it's for |",
      "| --- | --- |",
      ...GROUPS.map((g) => `| ${g.title} | ${g.hint.replace(/\|/g, "\\|")} |`),
    ].join("\n");
    return [
      fence(rows.join("\n")),
      "Big arrows are multi-line:",
      fence(sideBySide(bigArrows, "     ")),
      details("What each group is for", table),
    ].join("\n\n");
  },

  templates: () =>
    TEMPLATE_GROUPS.map((group) => {
      const items = TEMPLATES.filter((t) => t.group === group).map((t) =>
        details(escapeHtml(t.title), `${t.useFor}\n\n${fence(t.text, t.lang)}`),
      );
      return `#### ${group}\n\n${items.join("\n")}`;
    }).join("\n\n"),
};

let stale = false;
for (const { path, sections: wanted } of READMES) {
  const name = relative(resolve(__dirname, ".."), path);
  const before = readFileSync(path, "utf8");
  const seen = new Set<string>();
  // A function replacement, never a string one: `$&` and friends in the content would expand.
  const after = before.replace(
    /(<!-- gen:(\w+) -->)[\s\S]*?(<!-- \/gen:\2 -->)/g,
    (_match, open: string, section: string, close: string) => {
      if (!wanted.includes(section)) throw new Error(`${name} has an unknown section marker: ${section}`);
      seen.add(section);
      return `${open}\n${sections[section]()}\n${close}`;
    },
  );
  const missing = wanted.filter((section) => !seen.has(section));
  if (missing.length) {
    console.error(`${name} is missing markers for: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (process.argv.includes("--check")) {
    if (after !== before) {
      console.error(`${name} is out of date. Run \`npm run readme\`.`);
      stale = true;
    } else console.log(`${name} is up to date.`);
  } else {
    writeFileSync(path, after);
    console.log(after === before ? `${name} unchanged.` : `${name} updated.`);
  }
}
if (stale) process.exit(1);
