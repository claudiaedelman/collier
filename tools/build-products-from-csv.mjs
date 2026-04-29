import fs from "node:fs/promises";
import { parse } from "csv-parse/sync";

const csvPath = "c:/Users/claudede/Downloads/wc-product-export-29-4-2026-1777446609387.csv";
const outPath = "d:/collier/assets/js/wordpress-products.js";

const H = {
  id: "מזהה",
  type: "סוג",
  name: "שם",
  published: "פורסם",
  shortDescription: "תיאור קצר",
  description: "תיאור",
  salePrice: "מחיר מבצע",
  regularPrice: "מחיר רגיל",
  categories: "קטגוריות",
  images: "תמונות",
  lang: "שפה",
  translationGroup: "קבוצת תרגום",
  attrName: ["שיוך 1 שמות", "שיוך 2 שמות", "שיוך 3 שמות", "שיוך 4 שמות"],
  attrValue: ["שיוך 1 ערכים", "שיוך 2 ערכים", "שיוך 3 ערכים", "שיוך 4 ערכים"]
};

function cleanText(value) {
  if (!value) return "";
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickPrice(row) {
  const raw = row[H.salePrice] || row[H.regularPrice] || "0";
  const numeric = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

function mapCategory(categoryText, typeText) {
  const src = `${categoryText || ""} ${typeText || ""}`.toLowerCase();
  if (src.includes("booking") || src.includes("gift-card") || src.includes("appointment") || src.includes("קביעת תורים")) return "appointments";
  if (src.includes("טבעות") || src.includes("ring")) return "rings";
  if (src.includes("שרשראות") || src.includes("necklace")) return "necklaces";
  if (src.includes("צמיד") || src.includes("bracelet")) return "bracelets";
  if (src.includes("עגילים") || src.includes("פירסינג") || src.includes("earring") || src.includes("piercing")) return "earrings";
  return "earrings";
}

function safeString(value) {
  return JSON.stringify(value || "");
}

const rawCsv = await fs.readFile(csvPath, "utf8");
const rows = parse(rawCsv, {
  bom: true,
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true
});

const baseRows = rows.filter((r) => !String(r[H.type] || "").includes("variation") && String(r[H.published] || "") === "1");
const enByGroup = new Map();
for (const row of baseRows) {
  if (row[H.lang] === "en" && row[H.translationGroup]) {
    enByGroup.set(row[H.translationGroup], row);
  }
}

const heRows = baseRows.filter((r) => r[H.lang] === "he");
const products = [];
let nextId = 100;
let index = 0;

for (const he of heRows) {
  const group = he[H.translationGroup];
  const en = group ? enByGroup.get(group) : undefined;

  const nameHe = cleanText(he[H.name]);
  const nameEn = cleanText(en?.[H.name]) || nameHe;

  const descHe = cleanText(he[H.shortDescription] || he[H.description]).slice(0, 260);
  const descEn = (cleanText(en?.[H.shortDescription] || en?.[H.description]) || descHe).slice(0, 260);

  const image = String(he[H.images] || "").split(",")[0].trim();
  const category = mapCategory(en?.[H.categories] || he[H.categories], en?.[H.type] || he[H.type]);
  const createdAt = new Date(Date.UTC(2026, 0, 1, 0, index, 0)).toISOString();

  const attributes = [];
  for (let i = 0; i < 4; i += 1) {
    const heName = cleanText(he[H.attrName[i]]);
    const heValue = cleanText(he[H.attrValue[i]]);
    const enName = cleanText(en?.[H.attrName[i]]) || heName;
    const enValue = cleanText(en?.[H.attrValue[i]]) || heValue;
    if (!heName || (!heValue && !enValue)) continue;
    attributes.push({
      name: { he: heName, en: enName },
      value: { he: heValue, en: enValue }
    });
  }

  products.push({
    id: String(nextId),
    wpId: String(he[H.id] || ""),
    category,
    createdAt,
    price: pickPrice(he),
    image,
    name: { he: nameHe, en: nameEn },
    description: {
      he: descHe,
      en: descEn
    },
    attributes
  });

  nextId += 1;
  index += 1;
}

const fileLines = ["const WORDPRESS_PRODUCTS = ["];
for (const p of products) {
  fileLines.push("  {");
  fileLines.push(`    id: ${safeString(p.id)},`);
  fileLines.push(`    wpId: ${safeString(p.wpId)},`);
  fileLines.push(`    category: ${safeString(p.category)},`);
  fileLines.push(`    createdAt: ${safeString(p.createdAt)},`);
  fileLines.push(`    price: ${p.price},`);
  fileLines.push(`    image: ${safeString(p.image)},`);
  fileLines.push(`    name: { he: ${safeString(p.name.he)}, en: ${safeString(p.name.en)} },`);
  fileLines.push("    description: {");
  fileLines.push(`      he: ${safeString(p.description.he)},`);
  fileLines.push(`      en: ${safeString(p.description.en)}`);
  fileLines.push("    },");
  fileLines.push("    attributes: [");
  for (const a of p.attributes) {
    fileLines.push(
      `      { name: { he: ${safeString(a.name.he)}, en: ${safeString(a.name.en)} }, value: { he: ${safeString(a.value.he)}, en: ${safeString(a.value.en)} } },`
    );
  }
  fileLines.push("    ]");
  fileLines.push("  },");
}
fileLines.push("];\n");

await fs.writeFile(outPath, fileLines.join("\n"), "utf8");
console.log(`Generated ${products.length} products at ${outPath}`);
