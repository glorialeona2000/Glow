import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL || "https://belavica.com";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/rdv/", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
