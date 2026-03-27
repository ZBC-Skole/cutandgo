import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { requireSalonAccess } from "../../security/authz";

export const listBySalon = query({
  args: {
    salonId: v.id("salons"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const activeOnly = args.activeOnly ?? true;

    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();
    const services = await ctx.db
      .query("services")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();

    const filteredCategories = activeOnly
      ? categories.filter((item) => item.isActive)
      : categories;
    const filteredServices = activeOnly
      ? services.filter((item) => item.isActive)
      : services;

    return filteredCategories
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((category) => ({
        ...category,
        services: filteredServices.filter(
          (service) => service.categoryId === category._id,
        ),
      }));
  },
});

export const listPublicBySalon = query({
  args: {
    salonId: v.id("salons"),
  },
  handler: async (ctx, args) => {
    const salon = await ctx.db.get(args.salonId);
    if (!salon || !salon.isActive) {
      return [];
    }

    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();
    const services = await ctx.db
      .query("services")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();

    const activeCategories = categories.filter((item) => item.isActive);
    const activeServices = services.filter((item) => item.isActive);

    return activeCategories
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((category) => ({
        ...category,
        services: activeServices
          .filter((service) => service.categoryId === category._id)
          .sort((a, b) => a.name.localeCompare(b.name, "da-DK")),
      }))
      .filter((category) => category.services.length > 0);
  },
});

export const createCategory = mutation({
  args: {
    salonId: v.id("salons"),
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const now = Date.now();
    return await ctx.db.insert("serviceCategories", {
      salonId: args.salonId,
      name: args.name,
      description: args.description,
      displayOrder: args.displayOrder ?? 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createService = mutation({
  args: {
    salonId: v.id("salons"),
    categoryId: v.id("serviceCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    durationMinutes: v.number(),
    priceDkk: v.number(),
    bufferBeforeMinutes: v.optional(v.number()),
    bufferAfterMinutes: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.salonId !== args.salonId) {
      throw new Error("Kategorien findes ikke i denne salon.");
    }
    if (!category.isActive) {
      throw new Error("Kategorien er inaktiv. Vælg en aktiv kategori.");
    }

    if (args.durationMinutes <= 0) {
      throw new Error("durationMinutes skal være større end 0.");
    }

    const now = Date.now();
    return await ctx.db.insert("services", {
      salonId: args.salonId,
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      durationMinutes: args.durationMinutes,
      priceDkk: args.priceDkk,
      bufferBeforeMinutes: args.bufferBeforeMinutes ?? 0,
      bufferAfterMinutes: args.bufferAfterMinutes ?? 0,
      isActive: true,
      imageStorageId: args.imageStorageId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const archiveService = mutation({
  args: {
    salonId: v.id("salons"),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const service = await ctx.db.get(args.serviceId);
    if (!service || service.salonId !== args.salonId) {
      throw new Error("Service findes ikke i den valgte salon.");
    }

    await ctx.db.patch(args.serviceId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const archiveCategory = mutation({
  args: {
    salonId: v.id("salons"),
    categoryId: v.id("serviceCategories"),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.salonId !== args.salonId) {
      throw new Error("Kategori findes ikke i den valgte salon.");
    }

    const services = await ctx.db
      .query("services")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    const now = Date.now();
    await ctx.db.patch(args.categoryId, {
      isActive: false,
      updatedAt: now,
    });

    for (const service of services) {
      if (service.salonId === args.salonId) {
        await ctx.db.patch(service._id, {
          isActive: false,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

export const createProduct = mutation({
  args: {
    salonId: v.id("salons"),
    name: v.string(),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    priceDkk: v.number(),
    stockQuantity: v.number(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const now = Date.now();
    return await ctx.db.insert("products", {
      salonId: args.salonId,
      name: args.name,
      brand: args.brand,
      description: args.description,
      priceDkk: args.priceDkk,
      stockQuantity: args.stockQuantity,
      isActive: true,
      imageStorageId: args.imageStorageId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listProductsBySalon = query({
  args: {
    salonId: v.id("salons"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, [
      "owner",
      "manager",
      "stylist",
      "assistant",
    ]);

    const products = await ctx.db
      .query("products")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();

    return (
      (args.activeOnly ?? true)
        ? products.filter((product) => product.isActive)
        : products
    ).sort((a, b) => a.name.localeCompare(b.name, "da-DK"));
  },
});
