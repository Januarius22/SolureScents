import { CalendarClock, FilePenLine, Files, FolderTree, Image, LayoutDashboard, SearchCheck } from "lucide-react";
import type { ReactNode } from "react";

import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";
import { requireApplicationAccess } from "@/features/auth/services/authorization";

const navigation: readonly DashboardNavItem[] = [
  { href: "/publisher", icon: LayoutDashboard, label: "Overview" },
  { href: "/publisher/articles", icon: Files, label: "Articles" },
  { href: "/publisher/drafts", icon: FilePenLine, label: "Drafts" },
  { href: "/publisher/categories", icon: FolderTree, label: "Categories" },
  { href: "/publisher/media", icon: Image, label: "Media" },
  { href: "/publisher/scheduled", icon: CalendarClock, label: "Scheduled" },
  { href: "/publisher/seo", icon: SearchCheck, label: "SEO" },
] as const;

/** Independent editorial publishing layout. Authorization is added in Phase 2. */
export default async function PublisherLayout({ children }: Readonly<{ children: ReactNode }>) {
  const access = await requireApplicationAccess("publisher");
  return <DashboardShell appName="Publishing Studio" navigation={navigation} userEmail={access.email}>{children}</DashboardShell>;
}
