"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";

const categoryIdSchema = z.string().cuid();
const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function go(status: string): never {
  redirect(`/admin/categorias?status=${encodeURIComponent(status)}` as never);
}

export async function createCategory(formData: FormData) {
  await requireAdmin("/admin/categorias");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) go("invalid");

  const slug = slugify(parsed.data.name);
  if (!slug) go("invalid");

  try {
    await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        active: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      go("duplicate");
    }
    throw error;
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/productos");
  go("created");
}

export async function updateCategory(categoryId: string, formData: FormData) {
  await requireAdmin("/admin/categorias");

  const parsedId = categoryIdSchema.safeParse(categoryId);
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsedId.success || !parsed.success) go("invalid");

  const slug = slugify(parsed.data.name);
  if (!slug) go("invalid");

  try {
    await prisma.category.update({
      where: { id: parsedId.data },
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      go("duplicate");
    }
    throw error;
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/productos");
  go("updated");
}

export async function setCategoryActive(categoryId: string, active: boolean) {
  await requireAdmin("/admin/categorias");
  const parsedId = categoryIdSchema.safeParse(categoryId);
  if (!parsedId.success) return;

  await prisma.category.update({
    where: { id: parsedId.data },
    data: { active },
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/productos");
}
