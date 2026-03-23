import type { Salon, ServiceCategory, Stylist } from "@/features/booking/types";

export const salons: Salon[] = [
  {
    id: "salon-kbh-c",
    name: "Cut&Go - København C",
    city: "København",
    address: "Vesterbrogade 17",
  },
  {
    id: "salon-frederiksberg",
    name: "Cut&Go - Frederiksberg",
    city: "Frederiksberg",
    address: "Gammel Kongevej 94",
  },
];

export const serviceCategories: ServiceCategory[] = [
  {
    id: "klip",
    name: "Klip",
    services: [
      {
        id: "herreklip",
        name: "Herreklip",
        durationMinutes: 30,
        priceDkk: 320,
      },
      { id: "dameklip", name: "Dameklip", durationMinutes: 45, priceDkk: 470 },
      {
        id: "boerneklip",
        name: "Børneklip",
        durationMinutes: 25,
        priceDkk: 260,
      },
    ],
  },
  {
    id: "farve",
    name: "Farve",
    services: [
      {
        id: "bundfarve",
        name: "Bundfarve",
        durationMinutes: 90,
        priceDkk: 890,
      },
      {
        id: "helfarve",
        name: "Helfarve + finish",
        durationMinutes: 120,
        priceDkk: 1290,
      },
      {
        id: "striber",
        name: "Striber + toner",
        durationMinutes: 150,
        priceDkk: 1590,
      },
    ],
  },
  {
    id: "styling",
    name: "Styling",
    services: [
      {
        id: "foen",
        name: "Føn og styling",
        durationMinutes: 30,
        priceDkk: 340,
      },
      {
        id: "opsaetning",
        name: "Opsætning",
        durationMinutes: 60,
        priceDkk: 690,
      },
      { id: "skaeg", name: "Skægtrim", durationMinutes: 20, priceDkk: 220 },
    ],
  },
];

export const stylists: Stylist[] = [
  {
    id: "amalie",
    name: "Amalie",
    role: "Senior stylist",
    salonIds: ["salon-kbh-c"],
    workingHours: { start: "09:00", end: "17:00" },
    blocked: [
      { start: "10:15", end: "10:45" },
      { start: "12:30", end: "13:15" },
      { start: "15:00", end: "15:30" },
    ],
  },
  {
    id: "jonas",
    name: "Jonas",
    role: "Barber specialist",
    salonIds: ["salon-kbh-c", "salon-frederiksberg"],
    workingHours: { start: "10:00", end: "18:00" },
    blocked: [
      { start: "11:00", end: "11:30" },
      { start: "14:15", end: "15:15" },
    ],
  },
  {
    id: "sara",
    name: "Sara",
    role: "Color expert",
    salonIds: ["salon-frederiksberg"],
    workingHours: { start: "09:30", end: "17:30" },
    blocked: [
      { start: "10:30", end: "11:15" },
      { start: "13:00", end: "14:00" },
      { start: "16:30", end: "17:00" },
    ],
  },
  {
    id: "mikkel",
    name: "Mikkel",
    role: "Stylist",
    salonIds: ["salon-frederiksberg"],
    workingHours: { start: "08:30", end: "16:30" },
    blocked: [
      { start: "09:30", end: "10:00" },
      { start: "12:00", end: "12:45" },
      { start: "14:45", end: "15:15" },
    ],
  },
];
