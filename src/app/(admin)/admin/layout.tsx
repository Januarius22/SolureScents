import { BadgePercent, BarChart3, Boxes, CreditCard, LayoutDashboard, Package, Settings, ShoppingCart, Users } from "lucide-react";
import type { ReactNode } from "react";

import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";

const navigation: readonly DashboardNavItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/products", icon: Package, label: "Products" },
  { href: "/admin/inventory", icon: Boxes, label: "Inventory" },
  { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  { href: "/admin/payments", icon: CreditCard, label: "Payments" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/discounts", icon: BadgePercent, label: "Discounts" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
] as const;

/** Independent enterprise administration layout. Authorization is added in Phase 2. */
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <DashboardShell appName="Administration" navigation={navigation}>{children}</DashboardShell>;
}
