import type { MetadataRoute } from "next";

// Web app manifest, served at /manifest.webmanifest. Next links it from <head>
// automatically, so there is no <link rel="manifest"> to maintain by hand.
//
// Replaces the generated site.webmanifest that shipped with the icon set: that
// one had empty name/short_name and white theme colours, which would have shown
// a blank label and a white splash on a site that is dark everywhere.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "INVITUS | Екіпірування для пауерліфтингу",
    short_name: "INVITUS",
    description:
      "Український бренд екіпірування для пауерліфтингу. Атлетичні пояси, кистьові бинти та аксесуари для важкої атлетики.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#E74223",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
