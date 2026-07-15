import { Bell, Gift, Heart, House, MapPin, Package, Settings, Star, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";
import { requireApplicationAccess } from "@/features/auth/services/authorization";

const navigation: readonly DashboardNavItem[] = [
  { href: "/account", icon: House, label: "Overview" },
  { href: "/account/orders", icon: Package, label: "Orders" },
  { href: "/account/wishlist", icon: Heart, label: "Wishlist" },
  { href: "/account/addresses", icon: MapPin, label: "Addresses" },
  { href: "/account/reviews", icon: Star, label: "Reviews" },
  { href: "/account/rewards", icon: Gift, label: "Rewards" },
  { href: "/account/notifications", icon: Bell, label: "Notifications" },
  { href: "/account/profile", icon: UserRound, label: "Profile" },
  { href: "/account/settings", icon: Settings, label: "Settings" },
] as const;

/** Independent customer application layout. Authorization is added in Phase 2. */
export default async function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  const access = await requireApplicationAccess("account");
  return <DashboardShell appName="My Account" navigation={navigation} userEmail={access.email}>{children}</DashboardShell>;
}
