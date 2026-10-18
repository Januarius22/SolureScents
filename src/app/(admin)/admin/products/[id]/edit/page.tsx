import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireApplicationAccess } from "@/features/auth/services/authorization";
import {
  getAdminCatalogueFacets,
  getAdminProductForEdit,
} from "@/features/admin/services/product-admin-service";
import { ProductForm } from "@/features/admin/components/product-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getAdminProductForEdit(id);
  return {
    title: product ? `Edit ${product.name} | Solure Scents Admin` : "Edit Perfume | Solure Scents Admin",
  };
}

export default async function AdminEditProductPage({ params }: PageProps) {
  await requireApplicationAccess("admin");
  const { id } = await params;

  const [product, facets] = await Promise.all([
    getAdminProductForEdit(id),
    getAdminCatalogueFacets(),
  ]);

  if (!product) {
    notFound();
  }

  return <ProductForm initialData={product} facets={facets} mode="edit" />;
}
