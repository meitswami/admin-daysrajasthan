import { newUuid } from "@/lib/itinerary-builder/defaults";

export type PolicyLine = {
  id: string;
  title: string;
  description: string;
};

export type ContentBlockItem = {
  id: string;
  title: string;
  description: string;
  images: string[];
};

export type PreviewContact = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

/** Fixed master policies (Structure / Master Data) */
export const MASTER_TERMS: PolicyLine[] = [
  {
    id: "t1",
    title: "All bookings are subject to availability at the time of confirmation.",
    description: "",
  },
  {
    id: "t2",
    title:
      "Incase of non availability at recommended hotel/s, similar standard accommodation/s will be arranged.",
    description: "",
  },
  {
    id: "t3",
    title:
      "Final tour cost may vary based on seasonal demand, hotel availability, and last-minute changes.",
    description: "",
  },
  {
    id: "t4",
    title:
      "Rates quoted are based on current taxes and fuel charges. Any hike in taxes or fuel may result in a revised package cost.",
    description: "",
  },
  {
    id: "t5",
    title: "Guests are advised to carry valid government ID proof during the tour.",
    description: "",
  },
  {
    id: "t6",
    title:
      "The company reserves the right to modify or cancel the itinerary due to unforeseen circumstances like natural calamities, political unrest, or flight delays.",
    description: "",
  },
];

export const MASTER_CANCELLATION: PolicyLine[] = [
  {
    id: "c1",
    title: "Cancellation 30 days or more prior to arrival: 20% of total package cost.",
    description: "",
  },
  {
    id: "c2",
    title: "Cancellation between 15 to 29 days: 25% of total package cost.",
    description: "",
  },
  {
    id: "c3",
    title: "Cancellation between 7 to 14 days: 50% of total package cost.",
    description: "",
  },
  {
    id: "c4",
    title: "Cancellation within 7 days of arrival: 100% of total package cost (No refund).",
    description: "",
  },
  {
    id: "c5",
    title: 'In case of "No Show", there will be no refund.',
    description: "",
  },
  {
    id: "c6",
    title: "Refunds, if applicable, will be processed within 7–10 working days.",
    description: "",
  },
];

export const MASTER_PAYMENT: PolicyLine[] = [
  {
    id: "p1",
    title:
      "Booking Confirmation: 20% or 30% advance of the total package cost (as decided by admin/agent).",
    description: "",
  },
  {
    id: "p2",
    title: "30% need to pay at the time of hotel confirmation vouchers.",
    description: "",
  },
  {
    id: "p3",
    title: "50% upon arrival on day 01 in cash only",
    description: "",
  },
  {
    id: "p4",
    title:
      "In case of last-minute bookings (within 7 days), 50% payment is required at the time of confirmation.",
    description: "",
  },
  {
    id: "p5",
    title: "Payments can be made via bank transfer, UPI, or cheque (subject to clearance).",
    description: "",
  },
];

const IMG_ROOM =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=80";
const IMG_CAR =
  "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=200&q=80";
const IMG_FOOD =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80";

export const DEFAULT_INCLUSION_ITEMS: ContentBlockItem[] = [
  {
    id: "inc-1",
    title: "Air-Conditioned Accommodation",
    description:
      "Experience ultimate comfort with carefully selected air-conditioned hotels as per the chosen category.",
    images: [IMG_ROOM],
  },
  {
    id: "inc-2",
    title: "Delicious Breakfast",
    description: "Daily breakfast at the hotel as per the meal plan selected for your package.",
    images: [IMG_FOOD],
  },
  {
    id: "inc-3",
    title: "Exclusive AC Vehicle",
    description: "Private air-conditioned vehicle for all transfers and sightseeing as per itinerary.",
    images: [IMG_CAR],
  },
  {
    id: "inc-4",
    title: "Comfortable Travel Included in Your Package",
    description: "All surface transfers between cities and local sightseeing as mentioned in the itinerary.",
    images: [],
  },
  {
    id: "inc-5",
    title: "All applicable taxes",
    description: "GST and applicable taxes as per government rules at the time of booking.",
    images: [],
  },
];

export const DEFAULT_EXCLUSION_ITEMS: ContentBlockItem[] = [
  {
    id: "exc-1",
    title: "Meals & drinks other than specified in inclusions.",
    description: "",
    images: [],
  },
  {
    id: "exc-2",
    title:
      "Expenses of personal nature such as portages, tips, telephone calls, laundry expenses etc.",
    description: "",
    images: [],
  },
  {
    id: "exc-3",
    title: "All entrances & camera fees during sightseeing.",
    description: "",
    images: [],
  },
  {
    id: "exc-4",
    title: "Guide Charges.",
    description: "",
    images: [],
  },
  {
    id: "exc-5",
    title: "Insurance Cover.",
    description: "",
    images: [],
  },
  {
    id: "exc-6",
    title: "Any air/train/bus fare",
    description: "",
    images: [],
  },
];

export const PREVIEW_CONTACTS: PreviewContact[] = [
  {
    id: "ct-vandana",
    name: "Vandana Shekhawat",
    phone: "+919351549292",
    email: "rajasthantouringjaipur@gmail.com",
  },
  {
    id: "ct-shatrughan",
    name: "Shatrughan Singh",
    phone: "+918058100276",
    email: "rajasthantouringjaipur@gmail.com",
  },
  {
    id: "ct-hemendra",
    name: "Hemendra Singh",
    phone: "+919257368877",
    email: "rajasthantouringjaipur@gmail.com",
  },
  {
    id: "ct-priya",
    name: "Priya Vohra",
    phone: "+918766266066",
    email: "sales.rajasthantouring@gmail.com",
  },
  {
    id: "ct-soniya",
    name: "Soniya Shekhawat",
    phone: "+917357571614",
    email: "soniya.rajasthantouring@gmail.com",
  },
  {
    id: "ct-pooja",
    name: "Pooja Shekhawat",
    phone: "+919784011614",
    email: "pooja.rajasthantouring@gmail.com",
  },
];

export function stringsToContentBlocks(lines: string[]): ContentBlockItem[] {
  return lines.filter(Boolean).map((title) => ({
    id: newUuid(),
    title,
    description: "",
    images: [],
  }));
}

export function contentBlocksToStrings(items: ContentBlockItem[]): string[] {
  return items.map((i) => i.title).filter(Boolean);
}

export function emptyContentBlock(): ContentBlockItem {
  return { id: newUuid(), title: "", description: "", images: [] };
}
