import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

let cachedEnvironment: PublicEnvironment | undefined;

/** Validates public configuration at the infrastructure boundary before use. */
export function getPublicEnvironment(): PublicEnvironment {
  if (cachedEnvironment) {
    return cachedEnvironment;
  }

  const result = publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");

    throw new Error(`Invalid public environment configuration: ${fields}`);
  }

  cachedEnvironment = result.data;
  return cachedEnvironment;
}
