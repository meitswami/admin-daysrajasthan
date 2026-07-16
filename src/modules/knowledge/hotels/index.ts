export type { HotelRecord } from "../types";
export { getHotel, listHotels } from "../service";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "hotels" as const,
  description: "Hotels (website_hotels)",
} as const;
