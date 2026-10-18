import { NextResponse } from "next/server";
import { getCurrentUserAccess, resolveApplicationArea } from "@/features/auth/services/authorization";
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(request: Request) {
  try {
    // 1. Verify administrative access
    const userAccess = await getCurrentUserAccess();
    if (!userAccess || userAccess.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please sign in as an administrator." },
        { status: 401 },
      );
    }

    const area = resolveApplicationArea(userAccess.roles);
    if (area !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Administrative access required." },
        { status: 403 },
      );
    }

    // 2. Parse form data (Route Handlers do not have the 1 MB Server Action body limit)
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No image file provided in upload request." },
        { status: 400 },
      );
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "Image exceeds 5 MB limit. Please select a smaller photograph." },
        { status: 400 },
      );
    }

    // 4. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unsupported file format. Supported formats: JPEG, PNG, WebP, AVIF.",
        },
        { status: 400 },
      );
    }

    // 5. Connect to Supabase Storage
    const db = await createServerSupabaseClient();
    const privileged = createPrivilegedSupabaseClient();
    const storageClient = privileged || db;
    const bucketName = "product-media";

    // Ensure bucket exists
    const { data: buckets } = await storageClient.storage.listBuckets();
    const exists = buckets?.some((b) => b.id === bucketName || b.name === bucketName);
    if (!exists) {
      await storageClient.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: "26MB",
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });
    }

    const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const ext = ["jpg", "jpeg", "png", "webp", "avif"].includes(rawExt) ? rawExt : "jpg";
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const fileName = `${Date.now()}-${randomSuffix}.${ext}`;
    const filePath = `catalogue/${fileName}`;

    // 6. Upload file directly to Supabase storage
    const { error: uploadError } = await db.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      // Fallback with privileged client if RLS check requires service context
      if (privileged) {
        const { error: privError } = await privileged.storage
          .from(bucketName)
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: true,
          });
        if (privError) {
          throw new Error(`Storage upload error: ${privError.message}`);
        }
      } else {
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }
    }

    const { data: publicUrlData } = db.storage.from(bucketName).getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      data: {
        storage_path: publicUrlData.publicUrl,
        url: publicUrlData.publicUrl,
      },
    });
  } catch (error) {
    console.error("Direct storage upload API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal storage upload error.",
      },
      { status: 500 },
    );
  }
}
