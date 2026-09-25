import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Замовлення" };

export default function Page() {
  return <ComingSoon title="Замовлення">Список замовлень з фільтрами — у тікеті #107.</ComingSoon>;
}
