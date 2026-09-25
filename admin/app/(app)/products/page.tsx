import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Товари" };

export default function Page() {
  return <ComingSoon title="Товари">Продажі за товарами й розмірами — у тікеті #108.</ComingSoon>;
}
