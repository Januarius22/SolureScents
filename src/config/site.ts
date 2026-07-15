export const siteConfig = {
  name: "Solure Scents",
  tagline: "Scents That Speak. Memories That Stay.",
  description:
    "Discover an edited collection of remarkable fragrances, chosen for the memories they leave behind.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
