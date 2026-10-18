"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApplicationAccess } from "@/features/auth/services/authorization";
import {
  archiveProduct,
  createAdminProduct,
  toggleProductStatus,
  updateAdminProduct,
} from "@/features/admin/services/product-admin-service";
import {
  productAdminFormSchema,
} from "@/features/admin/validation/product-admin";
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/** Server Action: Creates a new perfume with variants, media, and inventory */
export async function createProductAction(
  rawInput: unknown,
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireApplicationAccess("admin");
    const parsed = productAdminFormSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed. Please review the form fields.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const productId = await createAdminProduct(parsed.data);

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");
    revalidatePath(`/shop/${parsed.data.slug}`);

    return {
      success: true,
      message: `Perfume "${parsed.data.name}" created successfully.`,
      data: { id: productId },
    };
  } catch (error) {
    console.error("createProductAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred while creating perfume.",
    };
  }
}

/** Server Action: Updates an existing perfume with variants, media, and inventory */
export async function updateProductAction(
  rawInput: unknown,
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireApplicationAccess("admin");
    const parsed = productAdminFormSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed. Please review the form fields.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    if (!parsed.data.id) {
      return {
        success: false,
        message: "Product identifier is required for update.",
      };
    }

    await updateAdminProduct(parsed.data.id, parsed.data);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${parsed.data.id}/edit`);
    revalidatePath("/shop");
    revalidatePath(`/shop/${parsed.data.slug}`);
    revalidatePath("/");

    return {
      success: true,
      message: `Perfume "${parsed.data.name}" updated successfully.`,
      data: { id: parsed.data.id },
    };
  } catch (error) {
    console.error("updateProductAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred while updating perfume.",
    };
  }
}

/** Server Action: Toggles publication status of a perfume */
export async function toggleProductStatusAction(
  productId: string,
  newStatus: "draft" | "active" | "archived",
): Promise<ActionResponse> {
  try {
    await requireApplicationAccess("admin");
    const id = z.string().uuid().parse(productId);
    const status = z.enum(["draft", "active", "archived"]).parse(newStatus);

    await toggleProductStatus(id, status);

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");

    return {
      success: true,
      message: `Product status changed to ${status}.`,
    };
  } catch (error) {
    console.error("toggleProductStatusAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to change product status.",
    };
  }
}

/** Server Action: Archives a perfume (soft delete) */
export async function archiveProductAction(productId: string): Promise<ActionResponse> {
  try {
    await requireApplicationAccess("admin");
    const id = z.string().uuid().parse(productId);

    await archiveProduct(id);

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");

    return {
      success: true,
      message: "Product archived successfully.",
    };
  } catch (error) {
    console.error("archiveProductAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to archive product.",
    };
  }
}

/** Server Action: Uploads product image to Supabase Storage with bucket assurance */
export async function uploadProductImageAction(
  formData: FormData,
): Promise<ActionResponse<{ storage_path: string; url: string }>> {
  try {
    await requireApplicationAccess("admin");
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return { success: false, message: "No image file provided." };
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, message: "Image exceeds 5MB maximum limit." };
    }

    // Validate mime type
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        message: "Invalid file type. Please upload a JPEG, PNG, WebP, or AVIF image.",
      };
    }

    const db = await createServerSupabaseClient();
    const privileged = createPrivilegedSupabaseClient();

    const bucketName = "product-media";

    // Ensure bucket exists
    const storageClient = privileged || db;
    const { data: buckets } = await storageClient.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.id === bucketName || b.name === bucketName);

    if (!bucketExists) {
      // Try to create bucket
      await storageClient.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: "26MB",
        allowedMimeTypes: ALLOWED_TYPES,
      });
    }

    const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const ext = ["jpg", "jpeg", "png", "webp", "avif"].includes(rawExt) ? rawExt : "jpg";
    const sanitizedBase = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .toLowerCase()
      .slice(0, 30);
    const fileName = `${Date.now()}-${sanitizedBase || "perfume"}.${ext}`;
    const filePath = `catalogue/${fileName}`;

    // Upload using standard client
    const { error: uploadError } = await db.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      // If client upload fails due to RLS, try privileged if available
      if (privileged) {
        const { error: privError } = await privileged.storage
          .from(bucketName)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: true,
          });
        if (privError) {
          throw new Error(`Upload failed: ${privError.message}`);
        }
      } else {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
    }

    const { data: publicUrlData } = db.storage.from(bucketName).getPublicUrl(filePath);

    return {
      success: true,
      data: {
        storage_path: filePath,
        url: publicUrlData.publicUrl,
      },
    };
  } catch (error) {
    console.error("uploadProductImageAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload product image.",
    };
  }
}
