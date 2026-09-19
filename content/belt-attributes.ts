// The bullet list between the belt photos on a belt's product page.
//
// Every INVITUS belt is the same belt underneath the artwork — 10 mm, four
// layers, lever — so this is category copy, not product copy, and lives here
// rather than in Strapi. The per-product `attributes` component in Strapi
// ("Товщина: 10 мм") holds the same facts as terse pairs; the design asks for
// sentences, and repeating six identical sentences across twenty entries would
// be twenty places to edit the next time the leather changes.

export const beltAttributes: string[] = [
  "Товщина 10 мм",
  "Виготовлений зі 100% натуральної шкіри",
  "Важільна застібка — розмір налаштовується один раз",
  "Складається з 4 шарів шкіри",
  "Підходить для присідань, станової тяги та інших силових вправ",
  "Внутрішній шар із замші забезпечує комфорт",
];
