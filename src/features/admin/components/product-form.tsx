"use client";

import { useState, useTransition, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Crown,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  AlertCircle,
  X,
  FileImage,
} from "lucide-react";

import {
  createProductAction,
  updateProductAction,
} from "@/features/admin/actions/product-admin-actions";
import type { AdminProductDetail } from "@/features/admin/services/product-admin-service";
import {
  generateSlug,
  generateSku,
  type ProductAdminFormValues,
  type VariantAdminInput,
  type ProductMediaInput,
} from "@/features/admin/validation/product-admin";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

interface ProductFormProps {
  initialData?: AdminProductDetail | null;
  facets: {
    brands: Array<{ id: string; name: string; slug: string }>;
    families: Array<{ id: string; name: string; slug: string }>;
  };
  mode: "create" | "edit";
}

interface ImageUploadItem {
  id: string; // Media id or local temp id
  previewUrl: string;
  storagePath: string;
  isPrimary: boolean;
  isUploading: boolean;
  fileName?: string;
  error?: string;
}

interface SimplifiedVariant {
  id?: string;
  size_ml: number | string;
  price_naira: number | string;
  initial_stock: number | string;
}

export function ProductForm({ initialData, facets, mode }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form IDs for accessibility
  const nameInputId = useId();
  const brandSelectId = useId();
  const descInputId = useId();

  // SECTION A: Product Information State
  const [name, setName] = useState(initialData?.name ?? "");
  const [category, setCategory] = useState<"unisex" | "men" | "women">(
    initialData?.category ?? "unisex",
  );
  const [collection, setCollection] = useState<"premium" | "regular">(
    initialData?.collection ?? "regular",
  );
  const [brandName, setBrandName] = useState(initialData?.brand?.name ?? "Solure Scents");
  const [customBrandMode, setCustomBrandMode] = useState(
    Boolean(
      initialData?.brand?.name &&
        !facets.brands.some((b) => b.name.toLowerCase() === initialData.brand.name.toLowerCase()),
    ),
  );
  const [description, setDescription] = useState(initialData?.description ?? "");

  // SECTION B: Product Images State
  const initialImages: ImageUploadItem[] = (initialData?.media ?? []).map((m) => ({
    id: m.id ?? m.storage_path,
    previewUrl: m.storage_path,
    storagePath: m.storage_path,
    isPrimary: m.is_primary,
    isUploading: false,
    fileName: m.alt_text,
  }));
  const [images, setImages] = useState<ImageUploadItem[]>(initialImages);

  // SECTION C: Variants (Price & Stock) State
  const initialVariants: SimplifiedVariant[] = initialData?.variants?.length
    ? initialData.variants.map((v) => ({
        id: v.id,
        size_ml: v.size_ml,
        price_naira: v.price_minor / 100,
        initial_stock: v.on_hand,
      }))
    : [
        { size_ml: 50, price_naira: 45000, initial_stock: 10 },
        { size_ml: 100, price_naira: 75000, initial_stock: 5 },
      ];
  const [variants, setVariants] = useState<SimplifiedVariant[]>(initialVariants);

  // Computed slug for preview
  const previewSlug = generateSlug(name) || "perfume-name";

  // Handle direct file uploads (Supabase Storage with API route fallback)
  const handleFileSelection = async (selectedFiles: FileList | File[]) => {
    const files = Array.from(selectedFiles);
    if (files.length === 0) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    setFeedback(null);

    for (const file of files) {
      // 1. Validate file constraints client-side
      if (!validTypes.includes(file.type)) {
        setFeedback({
          type: "error",
          message: `"${file.name}" is not a supported format. Please upload JPEG, PNG, WebP, or AVIF.`,
        });
        continue;
      }

      if (file.size > MAX_SIZE) {
        setFeedback({
          type: "error",
          message: `"${file.name}" exceeds the 5MB maximum limit. Please select an image under 5MB.`,
        });
        continue;
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const localPreviewUrl = URL.createObjectURL(file);

      // Optimistically add to image gallery with instant local preview
      setImages((prev) => [
        ...prev,
        {
          id: tempId,
          previewUrl: localPreviewUrl,
          storagePath: "",
          isPrimary: prev.length === 0,
          isUploading: true,
          fileName: file.name,
        },
      ]);

      try {
        let finalUrl = "";
        let finalStoragePath = "";
        let directSuccess = false;

        // Try direct authenticated upload from browser to Supabase Storage
        try {
          const supabase = getBrowserSupabaseClient();
          const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const ext = ["jpg", "jpeg", "png", "webp", "avif"].includes(rawExt) ? rawExt : "jpg";
          const sanitizedBase = file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .toLowerCase()
            .slice(0, 30);
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${sanitizedBase || "perfume"}.${ext}`;
          const filePath = `catalogue/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("product-media")
            .upload(filePath, file, {
              contentType: file.type,
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("product-media")
              .getPublicUrl(filePath);
            finalUrl = publicUrlData.publicUrl;
            finalStoragePath = filePath;
            directSuccess = true;
          }
        } catch (directErr) {
          console.warn("Direct browser upload skipped or failed, invoking API route fallback:", directErr);
        }

        // Fallback to Next.js route handler if direct upload encountered permissions/CORS
        if (!directSuccess) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/admin/product-media/upload", {
            method: "POST",
            body: formData,
          });

          const json = await response.json();
          if (response.ok && json.success && json.data) {
            finalUrl = json.data.url;
            finalStoragePath = json.data.storage_path;
          } else {
            throw new Error(json.message || `Failed to upload ${file.name}`);
          }
        }

        // Successfully uploaded: update item state
        setImages((prev) =>
          prev.map((img) =>
            img.id === tempId
              ? {
                  ...img,
                  isUploading: false,
                  storagePath: finalUrl || finalStoragePath,
                  previewUrl: finalUrl || localPreviewUrl,
                }
              : img,
          ),
        );
      } catch (err) {
        console.error("Image upload failed:", err);
        const errMsg = err instanceof Error ? err.message : `Failed to upload ${file.name}`;
        setImages((prev) =>
          prev.map((img) =>
            img.id === tempId ? { ...img, isUploading: false, error: errMsg } : img,
          ),
        );
        setFeedback({
          type: "error",
          message: errMsg,
        });
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Primary image selection
  const handleSetPrimary = (index: number) => {
    setImages((prev) =>
      prev.map((item, i) => ({
        ...item,
        isPrimary: i === index,
      })),
    );
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index];
      if (target?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const updated = prev.filter((_, i) => i !== index);
      // Ensure at least one image remains primary if any exist
      if (updated.length > 0 && !updated.some((item) => item.isPrimary) && updated[0]) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
  };

  // Add a new variant size
  const handleAddVariant = () => {
    const existingSizes = variants.map((v) => Number(v.size_ml));
    let nextSize = 50;
    if (!existingSizes.includes(50)) nextSize = 50;
    else if (!existingSizes.includes(100)) nextSize = 100;
    else if (!existingSizes.includes(30)) nextSize = 30;
    else nextSize = Math.max(...existingSizes) + 50;

    setVariants((prev) => [
      ...prev,
      {
        size_ml: nextSize,
        price_naira: 50000,
        initial_stock: 10,
      },
    ]);
  };

  // Remove variant
  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      setFeedback({
        type: "error",
        message: "At least one bottle size variant is required for every perfume.",
      });
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Update variant field
  const handleVariantChange = (
    index: number,
    field: keyof SimplifiedVariant,
    value: number | string,
  ) => {
    setVariants((prev) => {
      const copy = [...prev];
      const target = copy[index];
      if (target) {
        copy[index] = { ...target, [field]: value };
      }
      return copy;
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files);
    }
  };

  // Form submission
  const handleSubmit = (targetStatus?: "draft" | "active") => {
    const finalStatus =
      targetStatus ?? (mode === "create" ? "active" : (initialData?.status ?? "active"));

    // Check if any image is actively uploading
    if (images.some((img) => img.isUploading)) {
      setFeedback({
        type: "error",
        message: "Please wait for all image uploads to finish before saving.",
      });
      return;
    }

    // Basic required validation
    if (!name.trim()) {
      setFeedback({ type: "error", message: "Please provide a Perfume Name." });
      return;
    }
    if (description.trim().length < 20) {
      setFeedback({
        type: "error",
        message: "Please provide a description of at least 20 characters.",
      });
      return;
    }

    // Build variants with auto-generated SKUs and defaults
    const mappedVariants: VariantAdminInput[] = variants.map((v) => {
      const sizeMl = Number(v.size_ml) || 50;
      const priceNaira = Number(v.price_naira) || 0;
      const stock = Number(v.initial_stock) || 0;
      return {
        id: v.id,
        size_ml: sizeMl,
        label: `${sizeMl}ml Flacon`,
        sku: generateSku(name, sizeMl),
        price_naira: priceNaira,
        compare_at_price_naira: null,
        cost_naira: null,
        weight_grams: Math.max(100, Math.round(sizeMl * 4)),
        initial_stock: stock,
        low_stock_limit: 5,
        is_available: true,
      };
    });

    // Build media list from uploaded items
    const validMedia: ProductMediaInput[] = images
      .filter((img) => Boolean(img.storagePath))
      .map((img, idx) => ({
        id: img.id.startsWith("temp-") ? undefined : img.id,
        storage_path: img.storagePath,
        alt_text: `${name.trim() || "Solure Perfume"} bottle view ${idx + 1}`,
        is_primary: img.isPrimary,
        sort_order: idx,
        media_type: "image",
      }));

    // Find brand id if existing
    const matchedBrand = facets.brands.find(
      (b) => b.name.toLowerCase() === brandName.trim().toLowerCase(),
    );

    const payload: ProductAdminFormValues = {
      id: initialData?.id,
      name: name.trim(),
      brand_name: brandName.trim() || "Solure Scents",
      brand_id: matchedBrand?.id ?? initialData?.brand?.id ?? null,
      category,
      collection,
      description: description.trim(),
      status: finalStatus,
      variants: mappedVariants,
      media: validMedia,
      // Safely preserve existing advanced attributes during edits
      slug: initialData?.slug,
      subtitle: initialData?.subtitle,
      family_id: initialData?.family?.id ?? null,
      family_name: initialData?.family?.name ?? null,
      story: initialData?.story ?? null,
      concentration: initialData?.concentration ?? "edp",
      perfumer: initialData?.perfumer ?? null,
      launch_year: initialData?.launch_year ?? null,
      longevity_hours_min: initialData?.longevity_hours_min ?? null,
      longevity_hours_max: initialData?.longevity_hours_max ?? null,
      sillage: initialData?.sillage ?? null,
      top_notes: initialData?.notes?.top?.join(", ") ?? null,
      heart_notes: initialData?.notes?.heart?.join(", ") ?? null,
      base_notes: initialData?.notes?.base?.join(", ") ?? null,
      is_featured: initialData?.is_featured ?? false,
      seo_title: initialData?.seo_title ?? null,
      seo_description: initialData?.seo_description ?? null,
    };

    setFeedback(null);
    setFieldErrors({});

    startTransition(async () => {
      let res;
      if (mode === "create") {
        res = await createProductAction(payload);
      } else {
        res = await updateProductAction(payload);
      }

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "Perfume saved successfully. Returning to catalogue...",
        });
        setTimeout(() => {
          router.push("/admin/products");
          router.refresh();
        }, 1000);
      } else {
        setFeedback({
          type: "error",
          message: res.message || "Unable to save perfume. Please check the fields below.",
        });
        if (res.errors) {
          setFieldErrors(res.errors);
        }
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      {/* Top Navigation & Header */}
      <div className="flex flex-col gap-4 border-b border-charcoal/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-muted hover:text-charcoal uppercase transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Products</span>
          </Link>
          <h1 className="mt-2 font-display text-3xl text-charcoal sm:text-4xl">
            {mode === "create" ? "Add New Perfume" : `Edit ${initialData?.name}`}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Simple 3-step setup: Basic details, bottle photos, and size pricing.
          </p>
        </div>

        {/* Quick Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/products"
            className="border border-charcoal/20 bg-white px-4 py-2.5 text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:border-charcoal"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit("draft")}
            className="border border-gold/40 bg-ivory px-4 py-2.5 text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:bg-gold/15 disabled:opacity-50"
          >
            {isPending ? <Loader2 size={13} className="inline mr-1 animate-spin" /> : null}
            Save as Draft
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit("active")}
            className="inline-flex items-center gap-2 bg-charcoal px-5 py-2.5 text-xs font-semibold tracking-wider text-pearl uppercase transition hover:bg-gold hover:text-charcoal disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{mode === "create" ? "Publish Product" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`border p-4 text-sm flex items-start gap-3 transition-all ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-50 text-emerald-950"
              : "border-rose-500/40 bg-rose-50 text-rose-950"
          }`}
        >
          {feedback.type === "success" ? (
            <Check size={18} className="text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-rose-700 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-muted hover:text-charcoal"
            aria-label="Dismiss alert"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main 3-Section Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-8"
      >
        {/* ========================================================= */}
        {/* SECTION A: PRODUCT INFORMATION */}
        {/* ========================================================= */}
        <section className="border border-charcoal/15 bg-white p-6 sm:p-8 shadow-soft">
          <div className="border-b border-charcoal/10 pb-4">
            <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-gold uppercase">
              Section A · Product Information
            </span>
            <h2 className="mt-1 font-display text-2xl text-charcoal">Fragrance Essentials</h2>
            <p className="text-xs text-muted mt-0.5">
              General fragrance details shown on the storefront catalogue.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {/* Perfume Name */}
            <div>
              <label
                htmlFor={nameInputId}
                className="block text-xs font-semibold tracking-wider text-charcoal uppercase"
              >
                Perfume Name *
              </label>
              <input
                id={nameInputId}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Solure Oud Royal"
                className="mt-2 min-h-12 w-full border border-charcoal/20 bg-ivory/20 px-4 text-sm text-charcoal outline-none transition focus:border-gold focus:bg-white"
              />
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted font-mono">
                <span>Storefront URL:</span>
                <span className="text-charcoal font-semibold">/shop/{previewSlug}</span>
                <span className="text-[10px] text-muted-dark italic">(Generated automatically)</span>
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Brand & Category Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Brand Selection */}
              <div>
                <label
                  htmlFor={brandSelectId}
                  className="block text-xs font-semibold tracking-wider text-charcoal uppercase"
                >
                  Brand
                </label>
                {customBrandMode ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Enter brand name"
                      className="min-h-12 flex-1 border border-charcoal/20 bg-ivory/20 px-4 text-sm text-charcoal outline-none focus:border-gold focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomBrandMode(false);
                        setBrandName("Solure Scents");
                      }}
                      className="border border-charcoal/20 px-3 text-xs text-muted hover:text-charcoal"
                    >
                      Presets
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <select
                      id={brandSelectId}
                      value={brandName}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setCustomBrandMode(true);
                          setBrandName("");
                        } else {
                          setBrandName(e.target.value);
                        }
                      }}
                      className="min-h-12 flex-1 border border-charcoal/20 bg-ivory/20 px-4 text-sm text-charcoal outline-none focus:border-gold focus:bg-white"
                    >
                      <option value="Solure Scents">Solure Scents (House Signature)</option>
                      {facets.brands
                        .filter((b) => b.name.toLowerCase() !== "solure scents")
                        .map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      <option value="__custom__">+ Add New Brand...</option>
                    </select>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-muted">
                  The house brand is preselected by default.
                </p>
              </div>

              {/* Category Segmented Buttons */}
              <div>
                <label className="block text-xs font-semibold tracking-wider text-charcoal uppercase">
                  Category *
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { value: "unisex", label: "Unisex" },
                    { value: "men", label: "Men" },
                    { value: "women", label: "Women" },
                  ].map((cat) => {
                    const isSelected = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value as "unisex" | "men" | "women")}
                        className={`flex min-h-12 items-center justify-center gap-1.5 border text-xs font-semibold uppercase tracking-wider transition ${
                          isSelected
                            ? "border-charcoal bg-charcoal text-pearl shadow-sm"
                            : "border-charcoal/20 bg-ivory/20 text-charcoal hover:border-gold hover:bg-white"
                        }`}
                      >
                        {isSelected && <Check size={13} className="text-gold" />}
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Appears as filter and subtitle on customer search.
                </p>
              </div>
            </div>

            {/* Perfume Collection Selector (Sprint 3.3) */}
            <div className="border border-charcoal/10 bg-ivory/30 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <label className="block text-xs font-semibold tracking-wider text-charcoal uppercase">
                  Perfume Collection *
                </label>
                <span className="text-[11px] text-muted font-medium">Storefront classification tier</span>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCollection("premium")}
                  className={`flex min-h-12 items-center justify-between border px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${
                    collection === "premium"
                      ? "border-gold bg-charcoal text-pearl shadow-sm ring-1 ring-gold"
                      : "border-charcoal/20 bg-white text-charcoal hover:border-gold hover:bg-gold/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Crown size={15} className={collection === "premium" ? "text-gold" : "text-muted"} />
                    <span>Premium Collection</span>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                    collection === "premium" ? "bg-gold text-charcoal" : "bg-gold/20 text-gold"
                  }`}>
                    Gold Insignia
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCollection("regular")}
                  className={`flex min-h-12 items-center justify-between border px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${
                    collection === "regular"
                      ? "border-charcoal bg-charcoal text-pearl shadow-sm ring-1 ring-charcoal"
                      : "border-charcoal/20 bg-white text-charcoal hover:border-charcoal hover:bg-charcoal/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className={collection === "regular" ? "text-pearl" : "text-muted"} />
                    <span>Regular Collection</span>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                    collection === "regular" ? "bg-charcoal/40 text-pearl" : "bg-charcoal/10 text-charcoal"
                  }`}>
                    Neutral Insignia
                  </span>
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Premium fragrances receive the refined gold badge; Regular fragrances display the minimal neutral insignia on product cards and in the boutique.
              </p>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor={descInputId}
                className="block text-xs font-semibold tracking-wider text-charcoal uppercase"
              >
                Description *
              </label>
              <textarea
                id={descInputId}
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the fragrance character, impression, olfactory notes, and experience..."
                className="mt-2 w-full border border-charcoal/20 bg-ivory/20 p-4 text-sm text-charcoal outline-none transition focus:border-gold focus:bg-white"
              />
              <div className="mt-1 flex justify-between text-xs text-muted">
                <span>Minimum 20 characters</span>
                <span>{description.length} characters</span>
              </div>
              {fieldErrors.description && (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.description[0]}</p>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION B: PRODUCT IMAGES */}
        {/* ========================================================= */}
        <section className="border border-charcoal/15 bg-white p-6 sm:p-8 shadow-soft">
          <div className="border-b border-charcoal/10 pb-4">
            <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-gold uppercase">
              Section B · Product Images
            </span>
            <h2 className="mt-1 font-display text-2xl text-charcoal">Visual Assets</h2>
            <p className="text-xs text-muted mt-0.5">
              Upload clear bottle photography. Max 5MB per file (JPEG, PNG, WebP, AVIF). The first
              or crowned image is the storefront cover.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed p-8 text-center transition ${
                isDragging
                  ? "border-gold bg-gold/10"
                  : "border-charcoal/20 bg-ivory/20 hover:border-gold hover:bg-ivory/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(e) => {
                  if (e.target.files) handleFileSelection(e.target.files);
                }}
                className="hidden"
              />
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-soft text-gold">
                  <UploadCloud size={24} />
                </div>
                <p className="mt-3 text-sm font-semibold text-charcoal">
                  Click to select photos or drag & drop files here
                </p>
                <p className="mt-1 text-xs text-muted">
                  JPEG, PNG, WebP, or AVIF · Up to 5 MB per photo
                </p>
              </div>
            </div>

            {/* Uploaded Images Gallery */}
            {images.length > 0 && (
              <div>
                <p className="text-xs font-semibold tracking-wider text-charcoal uppercase mb-3">
                  Uploaded Photographs ({images.length})
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className={`group relative overflow-hidden border transition bg-ivory/10 ${
                        img.isPrimary ? "border-gold ring-2 ring-gold/40" : "border-charcoal/15"
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="relative aspect-square w-full bg-charcoal/5">
                        {img.previewUrl ? (
                          <Image
                            src={img.previewUrl}
                            alt={img.fileName || `Perfume view ${idx + 1}`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                            unoptimized={img.previewUrl.startsWith("blob:")}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted">
                            <FileImage size={32} />
                          </div>
                        )}

                        {/* Uploading Overlay */}
                        {img.isUploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-charcoal/70 text-pearl">
                            <Loader2 size={24} className="animate-spin text-gold" />
                            <span className="mt-1 text-[11px] font-medium">Uploading...</span>
                          </div>
                        )}

                        {/* Error Overlay */}
                        {img.error && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-900/80 p-2 text-center text-white">
                            <AlertCircle size={20} className="text-rose-200" />
                            <span className="mt-1 text-[10px] leading-tight text-rose-100 line-clamp-3">
                              {img.error}
                            </span>
                          </div>
                        )}

                        {/* Primary Badge */}
                        {img.isPrimary && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-charcoal/90 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gold uppercase shadow">
                            <Crown size={11} className="fill-gold" />
                            <span>Cover</span>
                          </div>
                        )}

                        {/* Action buttons on card hover */}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-charcoal/80 p-2 opacity-0 transition group-hover:opacity-100">
                          {!img.isPrimary ? (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(idx)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-pearl hover:text-gold uppercase"
                            >
                              <Crown size={12} />
                              <span>Set Cover</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-gold uppercase font-semibold">
                              Primary
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="text-pearl hover:text-rose-400 p-1"
                            aria-label="Remove image"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION C: PRICE & STOCK */}
        {/* ========================================================= */}
        <section className="border border-charcoal/15 bg-white p-6 sm:p-8 shadow-soft">
          <div className="border-b border-charcoal/10 pb-4">
            <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-gold uppercase">
              Section C · Price & Stock
            </span>
            <h2 className="mt-1 font-display text-2xl text-charcoal">Bottle Sizes & Pricing</h2>
            <p className="text-xs text-muted mt-0.5">
              Add bottle volumes (e.g. 50ml, 100ml) with their retail price in Naira and current stock
              count. SKUs are generated automatically.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {variants.map((v, idx) => {
              const sizeMl = Number(v.size_ml) || 50;
              const generatedSku = generateSku(name, sizeMl);

              return (
                <div
                  key={v.id ?? idx}
                  className="border border-charcoal/15 bg-ivory/10 p-4 sm:p-5 transition hover:border-charcoal/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-charcoal/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-[11px] font-semibold text-pearl">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-charcoal uppercase">
                        Size Option {idx + 1}
                      </span>
                      <span className="text-[11px] font-mono text-muted">({generatedSku})</span>
                    </div>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="inline-flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900 transition self-start sm:self-auto"
                      >
                        <Trash2 size={12} />
                        <span>Remove Size</span>
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {/* Bottle Size */}
                    <div>
                      <label className="block text-[11px] font-semibold tracking-wider text-charcoal uppercase">
                        Bottle Size (ml) *
                      </label>
                      <div className="mt-1.5 flex items-center border border-charcoal/20 bg-white">
                        <input
                          type="number"
                          required
                          min={1}
                          max={1000}
                          value={v.size_ml}
                          onChange={(e) => handleVariantChange(idx, "size_ml", e.target.value)}
                          className="min-h-11 w-full bg-transparent px-3 text-sm text-charcoal outline-none font-mono"
                        />
                        <span className="pr-3 text-xs font-semibold text-muted">ml</span>
                      </div>
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-[11px] font-semibold tracking-wider text-charcoal uppercase">
                        Selling Price (₦) *
                      </label>
                      <div className="mt-1.5 flex items-center border border-charcoal/20 bg-white">
                        <span className="pl-3 text-xs font-semibold text-charcoal">₦</span>
                        <input
                          type="number"
                          required
                          min={0}
                          step={500}
                          value={v.price_naira}
                          onChange={(e) => handleVariantChange(idx, "price_naira", e.target.value)}
                          placeholder="45000"
                          className="min-h-11 w-full bg-transparent px-2 text-sm text-charcoal outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Quantity Available */}
                    <div>
                      <label className="block text-[11px] font-semibold tracking-wider text-charcoal uppercase">
                        Quantity Available *
                      </label>
                      <div className="mt-1.5 flex items-center border border-charcoal/20 bg-white">
                        <input
                          type="number"
                          required
                          min={0}
                          value={v.initial_stock}
                          onChange={(e) => handleVariantChange(idx, "initial_stock", e.target.value)}
                          placeholder="10"
                          className="min-h-11 w-full bg-transparent px-3 text-sm text-charcoal outline-none font-mono"
                        />
                        <span className="pr-3 text-xs text-muted">units</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Volume Presets & Custom Size Button */}
            <div className="mt-4 pt-3 border-t border-charcoal/10 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Quick Add Size:
                </span>
                {[
                  { size: 10, label: "10ml Sample", price: 15000 },
                  { size: 15, label: "15ml Travel", price: 20000 },
                  { size: 30, label: "30ml Flacon", price: 30000 },
                  { size: 50, label: "50ml Standard", price: 45000 },
                  { size: 100, label: "100ml Signature", price: 75000 },
                ].map((preset) => {
                  const alreadyExists = variants.some((v) => Number(v.size_ml) === preset.size);
                  return (
                    <button
                      key={preset.size}
                      type="button"
                      disabled={alreadyExists}
                      onClick={() => {
                        setVariants((prev) => [
                          ...prev,
                          {
                            size_ml: preset.size,
                            price_naira: preset.price,
                            initial_stock: 10,
                          },
                        ]);
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase border transition ${
                        alreadyExists
                          ? "border-charcoal/10 bg-charcoal/5 text-muted/40 cursor-not-allowed"
                          : "border-charcoal/20 bg-white text-charcoal hover:border-gold hover:text-gold hover:bg-gold/5 shadow-2xs"
                      }`}
                    >
                      <Plus size={11} className={alreadyExists ? "text-muted/40" : "text-gold"} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom / Another Size Button */}
              <button
                type="button"
                onClick={handleAddVariant}
                className="inline-flex items-center gap-2 border border-dashed border-charcoal/30 bg-ivory/30 px-5 py-3 text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:border-gold hover:bg-gold/10 w-full justify-center"
              >
                <Plus size={14} className="text-gold" />
                <span>+ Add Custom Size</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* BOTTOM ACTION BAR */}
        {/* ========================================================= */}
        <div className="flex flex-col-reverse gap-4 border-t border-charcoal/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/products"
            className="border border-charcoal/20 bg-white px-6 py-3 text-center text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:border-charcoal"
          >
            Cancel
          </Link>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSubmit("draft")}
              className="w-full sm:w-auto border border-gold/40 bg-ivory px-6 py-3 text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:bg-gold/15 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={13} className="inline mr-1 animate-spin" /> : null}
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSubmit("active")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-charcoal px-8 py-3 text-xs font-semibold tracking-wider text-pearl uppercase transition hover:bg-gold hover:text-charcoal disabled:opacity-50 shadow-soft"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{mode === "create" ? "Publish Product" : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
