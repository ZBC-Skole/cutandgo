import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const appRoleValidator = v.union(
  v.literal("admin"),
  v.literal("medarbejder"),
  v.literal("kunde"),
);

const salonRoleValidator = v.union(
  v.literal("owner"),
  v.literal("manager"),
  v.literal("stylist"),
  v.literal("assistant"),
);

const bookingStatusValidator = v.union(
  v.literal("booked"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("cancelled_by_customer"),
  v.literal("cancelled_by_salon"),
  v.literal("no_show"),
);

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  userRoles: defineTable({
    authUserId: v.string(),
    role: appRoleValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_auth_user_id", ["authUserId"]),

  userProfiles: defineTable({
    authUserId: v.string(),
    fullName: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    preferredSalonId: v.optional(v.id("salons")),
    defaultLatitude: v.optional(v.number()),
    defaultLongitude: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user_id", ["authUserId"])
    .index("by_preferred_salon", ["preferredSalonId"]),

  employeeFirstLoginRequirements: defineTable({
    authUserId: v.string(),
    mustChangePassword: v.boolean(),
    temporaryPinIssuedAt: v.number(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_auth_user_id", ["authUserId"]),

  adminOnboardingStates: defineTable({
    authUserId: v.string(),
    completedAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_auth_user_id", ["authUserId"]),

  salons: defineTable({
    name: v.string(),
    slug: v.string(),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    postalCode: v.string(),
    city: v.string(),
    countryCode: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_city", ["city"])
    .index("by_is_active", ["isActive"]),

  salonOpeningHours: defineTable({
    salonId: v.id("salons"),
    weekday: v.number(),
    opensAt: v.string(),
    closesAt: v.string(),
    isClosed: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_salon", ["salonId"])
    .index("by_salon_weekday", ["salonId", "weekday"]),

  employees: defineTable({
    authUserId: v.optional(v.string()),
    fullName: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_auth_user_id", ["authUserId"]),

  employeeSalonRoles: defineTable({
    employeeId: v.id("employees"),
    salonId: v.id("salons"),
    role: salonRoleValidator,
    canManageSchedule: v.boolean(),
    canManageProducts: v.boolean(),
    isActive: v.boolean(),
    hiredAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employee", ["employeeId"])
    .index("by_salon", ["salonId"])
    .index("by_salon_employee", ["salonId", "employeeId"]),

  employeeWorkingHours: defineTable({
    employeeId: v.id("employees"),
    salonId: v.id("salons"),
    weekday: v.number(),
    startAt: v.string(),
    endAt: v.string(),
    isOff: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_employee", ["employeeId"])
    .index("by_salon", ["salonId"])
    .index("by_employee_weekday", ["employeeId", "weekday"]),

  employeeAbsences: defineTable({
    employeeId: v.id("employees"),
    salonId: v.id("salons"),
    startAt: v.number(),
    endAt: v.number(),
    reason: v.optional(v.string()),
    status: v.union(
      v.literal("planned"),
      v.literal("active"),
      v.literal("resolved"),
    ),
    cancelledAppointmentsCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employee_start", ["employeeId", "startAt"])
    .index("by_salon_start", ["salonId", "startAt"]),

  serviceCategories: defineTable({
    salonId: v.id("salons"),
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_salon", ["salonId"])
    .index("by_salon_display_order", ["salonId", "displayOrder"]),

  services: defineTable({
    salonId: v.id("salons"),
    categoryId: v.id("serviceCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    durationMinutes: v.number(),
    priceDkk: v.number(),
    bufferBeforeMinutes: v.number(),
    bufferAfterMinutes: v.number(),
    isActive: v.boolean(),
    imageStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_salon", ["salonId"])
    .index("by_salon_category", ["salonId", "categoryId"])
    .index("by_category", ["categoryId"])
    .index("by_salon_active", ["salonId", "isActive"]),

  products: defineTable({
    salonId: v.id("salons"),
    name: v.string(),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    priceDkk: v.number(),
    stockQuantity: v.number(),
    isActive: v.boolean(),
    imageStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_salon", ["salonId"])
    .index("by_salon_active", ["salonId", "isActive"]),

  bookings: defineTable({
    customerAuthUserId: v.string(),
    salonId: v.id("salons"),
    employeeId: v.id("employees"),
    serviceId: v.id("services"),
    categoryId: v.id("serviceCategories"),
    serviceNameSnapshot: v.string(),
    durationMinutesSnapshot: v.number(),
    priceDkkSnapshot: v.number(),
    startAt: v.number(),
    endAt: v.number(),
    status: bookingStatusValidator,
    customerNote: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),
    cancelledAt: v.optional(v.number()),
    cancelledByAuthUserId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer_start", ["customerAuthUserId", "startAt"])
    .index("by_employee_start", ["employeeId", "startAt"])
    .index("by_salon_start", ["salonId", "startAt"])
    .index("by_salon_status_start", ["salonId", "status", "startAt"])
    .index("by_employee_status_start", ["employeeId", "status", "startAt"]),

  appointmentPhotos: defineTable({
    bookingId: v.id("bookings"),
    storageId: v.id("_storage"),
    photoType: v.union(
      v.literal("before"),
      v.literal("after"),
      v.literal("reference"),
    ),
    uploadedByAuthUserId: v.string(),
    caption: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_booking", ["bookingId"])
    .index("by_booking_type", ["bookingId", "photoType"]),

  salonPhotos: defineTable({
    salonId: v.id("salons"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    uploadedByAuthUserId: v.string(),
    createdAt: v.number(),
  }).index("by_salon", ["salonId"]),
});
