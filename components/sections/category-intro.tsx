import { FadeUp } from "@/components/ui/fade-up";
import type { CategoryIntroCopy } from "@/content/category-copy";

// The prose block under a category's product grid. It exists for two readers at
// once: a visitor deciding which of four near-identical-looking belts is theirs,
// and an index that until now saw four category pages differing only by their
// product thumbnails.
//
// Placed after the grid on purpose — the products are what the visitor came
// for, and copy above them would push the catalog below the fold.

interface Props {
  intro: CategoryIntroCopy;
}

export function CategoryIntro({ intro }: Props) {
  return (
    <section className="bg-black pb-16 lg:pb-24">
      <div className="container-main">
        <FadeUp className="max-w-3xl">
          <h2 className="font-heading text-h2 font-bold text-white">
            {intro.heading}
          </h2>

          <div className="mt-6 space-y-4 lg:mt-8 lg:space-y-6">
            {intro.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-body-2 text-neutral-300">
                {paragraph}
              </p>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
