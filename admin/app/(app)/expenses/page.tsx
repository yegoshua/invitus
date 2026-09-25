import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Витрати" };

export default function Page() {
  return <ComingSoon title="Витрати">Журнал і ручне внесення витрат — у тікеті #109.</ComingSoon>;
}
