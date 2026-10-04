"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";

const productIdSchema = z.string().cuid();

const allowedImageHosts = new Set([
  "res.cloudinary.com",
  "nagiseishiro123456-creator.github.io",
  "raw.githubusercontent.com",
]);

const imageUrlSchema = z.string().trim().refine((value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedImageHosts.has(url.hostname);
  } catch {
    return false;
  }
}, "La imagen debe usar HTTPS y un proveedor de imágenes permitido.");

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(140).optional(),
  sku: z.string().trim().max(60).optional(),
  shortDescription: z.string().trim().max(220).optional(),
  description: z.string().trim().min(10).max(6000),
  price: z.coerce.number().positive().max(999999),
  stock: z.coerce.number().int().min(0).max(999999),
  categoryName: z.string().trim().max(100).optional(),
  imageUrl: imageUrlSchema,
});

const stockSchema = z.object({
  stock: z.coerce.number().int().min(0).max(999999),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function optionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    slug: optionalText(formData.get("slug")),
    sku: optionalText(formData.get("sku")),
    shortDescription: optionalText(formData.get("shortDescription")),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    categoryName: optionalText(formData.get("categoryName")),
    imageUrl: optionalText(formData.get("imageUrl")) ?? "",
  });
}

async function resolveCategoryId(categoryName?: string) {
  if (!categoryName) return null;

  const slug = slugify(categoryName);
  if (!slug) return null;

  const category = await prisma.category.upsert({
    where: { slug },
    update: { name: categoryName, active: true },
    create: { name: categoryName, slug, active: true },
    select: { id: true },
  });

  return category.id;
}

function productRedirect(path: string, status: string): never {
  redirect(`${path}?status=${encodeURIComponent(status)}`);
}

export async function createProduct(formData: FormData) {
  await requireAdmin("/admin/productos/nuevo");

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    productRedirect("/admin/productos/nuevo", "invalid");
  }

  const data = parsed.data;
  const slug = slugify(data.slug || data.name);
  if (!slug) productRedirect("/admin/productos/nuevo", "invalid-slug");

  const categoryId = await resolveCategoryId(data.categoryName);
  const featured = formData.get("featured") === "on";
  const active = formData.get("active") === "on";

  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        sku: data.sku || null,
        shortDescription: data.shortDescription || null,
        description: data.description,
        price: new Prisma.Decimal(data.price),
        stock: data.stock,
        categoryId,
        featured,
        active,
        ...(data.imageUrl
          ? {
              images: {
                create: {
                  url: data.imageUrl,
                  alt: data.name,
                  position: 0,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    revalidatePath("/");
    revalidatePath("/productos");
    revalidatePath("/admin/productos");
    redirect(`/admin/productos/${product.id}?status=created`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      productRedirect("/admin/productos/nuevo", "duplicate");
    }
    throw error;
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  await requireAdmin(`/admin/productos/${productId}`);

  const parsedId = productIdSchema.safeParse(productId);
  const parsed = parseProductForm(formData);
  if (!parsedId.success || !parsed.success) {
    productRedirect(`/admin/productos/${productId}`, "invalid");
  }

  const data = parsed.data;
  const slug = slugify(data.slug || data.name);
  if (!slug) productRedirect(`/admin/productos/${productId}`, "invalid-slug");

  const categoryId = await resolveCategoryId(data.categoryName);
  const featured = formData.get("featured") === "on";
  const active = formData.get("active") === "on";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: parsedId.data },
        data: {
          name: data.name,
          slug,
          sku: data.sku || null,
          shortDescription: data.shortDescription || null,
          description: data.description,
          price: new Prisma.Decimal(data.price),
          stock: data.stock,
          categoryId,
          featured,
          active,
        },
      });

      if (data.imageUrl) {
        const firstImage = await tx.productImage.findFirst({
          where: { productId: parsedId.data },
          orderBy: { position: "asc" },
          select: { id: true },
        });

        if (firstImage) {
          await tx.productImage.update({
            where: { id: firstImage.id },
            data: { url: data.imageUrl, alt: data.name, position: 0 },
          });
        } else {
          await tx.productImage.create({
            data: {
              productId: parsedId.data,
              url: data.imageUrl,
              alt: data.name,
              position: 0,
            },
          });
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/productos");
    revalidatePath(`/productos/${slug}`);
    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${parsedId.data}`);
    redirect(`/admin/productos/${parsedId.data}?status=updated`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      productRedirect(`/admin/productos/${productId}`, "duplicate");
    }
    throw error;
  }
}

export async function setProductActive(productId: string, active: boolean) {
  await requireAdmin("/admin/productos");
  const parsedId = productIdSchema.safeParse(productId);
  if (!parsedId.success) return;

  const product = await prisma.product.update({
    where: { id: parsedId.data },
    data: { active },
    select: { slug: true },
  });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath(`/productos/${product.slug}`);
  revalidatePath("/admin/productos");
}

export async function updateInventory(productId: string, formData: FormData) {
  await requireAdmin("/admin/inventario");
  const parsedId = productIdSchema.safeParse(productId);
  const parsedStock = stockSchema.safeParse({ stock: formData.get("stock") });
  if (!parsedId.success || !parsedStock.success) return;

  const product = await prisma.product.update({
    where: { id: parsedId.data },
    data: { stock: parsedStock.data.stock },
    select: { slug: true },
  });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath(`/productos/${product.slug}`);
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/productos");
}
