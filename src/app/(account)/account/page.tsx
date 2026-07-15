import { SectionHeading } from "@/components/ui/section-heading";

export const metadata = { title: "My Account" };

/** Customer application boundary confirmation page. */
export default function AccountPage() {
  return <SectionHeading eyebrow="Customer application" title="Welcome back" />;
}
