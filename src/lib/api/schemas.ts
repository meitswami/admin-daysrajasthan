import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10),
});

export const inquirySchema = z.object({
  customer_name: z.string().min(2),
  mobile: z.string().min(10),
  email: z.string().email(),
  destination: z.string().optional(),
  travel_date: z.string().optional(),
  adults: z.coerce.number().int().min(1).default(1),
  children: z.coerce.number().int().min(0).default(0),
  budget: z.string().optional(),
  additional_requirements: z.string().optional(),
  source_page: z.string().optional(),
});

export const downloadSchema = z.object({
  itinerary_id: z.string().optional(),
  package_name: z.string().min(2),
  customer_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  destination: z.string().optional(),
  source_page: z.string().optional(),
});

export const whatsappSchema = z.object({
  customer_name: z.string().optional(),
  phone: z.string().min(10),
  selected_package: z.string().optional(),
  destination: z.string().optional(),
  source_page: z.string().optional(),
  landing_url: z.string().url().optional(),
});
