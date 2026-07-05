// Shared slug generation: product URLs (lib/api.ts) and Strapi extras
// matching (lib/product-extras.ts) must produce identical slugs.

const UA_TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie",
  ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
  ю: "iu", я: "ia",
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[а-щьюяґєії]/g, (ch) => UA_TRANSLIT[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
