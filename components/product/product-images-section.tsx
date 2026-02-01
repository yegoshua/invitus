"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface ProductImagesSectionProps {
  images: { src: string; alt: string }[];
}

export function ProductImagesSection({ images }: ProductImagesSectionProps) {
  return (
    <section className="bg-black py-4">
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative aspect-[696/870] rounded-section overflow-hidden"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
