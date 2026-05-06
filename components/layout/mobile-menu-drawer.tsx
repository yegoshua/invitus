"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuStore } from "@/stores/menu";
import { navLinks, socialLinks } from "@/content/navigation";

export function MobileMenuDrawer() {
  const isOpen = useMenuStore((state) => state.isOpen);
  const closeMenu = useMenuStore((state) => state.closeMenu);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-60 bg-[#0000007A] backdrop-blur-xl"
            onClick={closeMenu}
          />
          <motion.div
            initial={{ x: "105%" }}
            animate={{ x: 0 }}
            exit={{ x: "105%" }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-4 top-4 bottom-4 z-70 w-[calc(100%-32px)] bg-white rounded-3xl flex flex-col overflow-hidden"
          >
            <button
              className="absolute top-6 right-6 p-2 text-black hover:text-neutral-600 transition-colors cursor-pointer"
              onClick={closeMenu}
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col md:flex-row gap-12 p-8 pt-12 overflow-y-auto flex-1">
              <div className="flex-1">
                <h3 className="text-sm font-heading font-medium text-neutral-500 uppercase tracking-wider mb-6">
                  Продукти
                </h3>
                <nav className="flex flex-col gap-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="font-heading text-2xl font-bold text-black hover:text-neutral-600 transition-colors"
                      onClick={closeMenu}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-heading font-medium text-neutral-500 uppercase tracking-wider mb-6">
                  Соціальні мережі
                </h3>
                <nav className="flex flex-col gap-8">
                  {socialLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-heading text-2xl font-bold text-black hover:text-neutral-600 transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}