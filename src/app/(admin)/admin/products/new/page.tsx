import type { Metadata } from "next";
import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { getAdminCatalogueFacets } from "@/features/admin/services/product-admin-service";
import { ProductForm } from "@/features/admin/components/product-form";

export const metadata: Metadata = {
  title: "Add New Perfume | Solure Scents Admin",
};

export default async function AdminNewProductPage() {
  await requireApplicationAccess("admin");
  const facets = await getAdminCatalogueFacets();

  return <ProductForm facets={facets} mode="create" />;
}
