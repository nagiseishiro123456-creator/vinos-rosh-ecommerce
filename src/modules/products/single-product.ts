import { cache } from "react";
import { prisma } from "@/lib/prisma";
export const ROSH_PRODUCT_SKU = "ROSH-750";
export const getRoshProduct = cache(async () => prisma.product.findUnique({where:{sku:ROSH_PRODUCT_SKU},include:{category:true,images:{orderBy:{position:"asc"},take:1}}}));
