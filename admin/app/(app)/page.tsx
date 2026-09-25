import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Огляд" };

export default function Page() {
  return <ComingSoon title="Огляд">Revenue, Profit, Stuck і Open orders — у тікеті #106.</ComingSoon>;
}
