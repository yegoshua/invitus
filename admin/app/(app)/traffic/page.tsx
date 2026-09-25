import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Трафік" };

export default function Page() {
  return <ComingSoon title="Трафік">Воронка GA4 і Ad spend по каналах — у тікеті #112.</ComingSoon>;
}
