import { HomeExperience } from "@/features/storefront/components/home-experience";
import { siteConfig } from "@/config/site";

/** Editorial storefront entrance with motion isolated in a dedicated client boundary. */
export default function HomePage() {
  return <HomeExperience description={siteConfig.description} />;
}
