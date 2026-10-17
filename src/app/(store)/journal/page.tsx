import type { Metadata } from "next";

import { JournalExperience } from "@/features/storefront/components/journal-experience";

export const metadata: Metadata = {
  title: "The Journal · Scent, Ritual & Literature",
  description:
    "Explore thoughtful essays, olfactory chemistry, raw botanical extraction, and the quiet ritual of fine fragrance.",
};

export default function JournalPage() {
  return <JournalExperience />;
}
