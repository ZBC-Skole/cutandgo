import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSalonAccess } from "./lib/authz";

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

    const filteredCategories = activeOnly ? categories.filter((item) => item.isActive) : categories;
    const filteredServices = activeOnly ? services.filter((item) => item.isActive) : services;

    return filteredCategories
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((category) => ({
        ...category,
        services: filteredServices.filter((service) => service.categoryId === category._id),
      }));
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

