import type { MetadataRoute } from "next";
import { publicRobots } from "@/lib/seo";
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return publicRobots();
}
