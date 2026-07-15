import { z } from "zod";
export const fragrancePreferencesSchema=z.object({
  mood:z.enum(["quiet","balanced","bold"]).default("balanced"),
  occasion:z.enum(["everyday","evening","occasion"]).default("everyday"),
  character:z.enum(["fresh","floral","woody","amber"]).default("fresh"),
});
export type FragrancePreferences=z.infer<typeof fragrancePreferencesSchema>;
