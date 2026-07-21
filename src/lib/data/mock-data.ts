import type {
  Blog,
  BlogCategory,
  BlogTag,
  ContactQuery,
  CrmSyncLog,
  DashboardStats,
  Itinerary,
  ItineraryDownload,
  PackageInquiry,
  WhatsappLead,
} from "@/types/database";

// ─── Stable IDs — match supabase/migrations/002_seed_dummy_data.sql ─────────
export const IDS = {
  itineraries: {
    jaipur: "11111111-1111-1111-1111-111111111001",
    goldenTriangle: "11111111-1111-1111-1111-111111111002",
    jaisalmer: "11111111-1111-1111-1111-111111111003",
    udaipur: "11111111-1111-1111-1111-111111111004",
    ranthambore: "11111111-1111-1111-1111-111111111005",
  },
  categories: {
    travelTips: "55555555-5555-5555-5555-555555555001",
    destinations: "55555555-5555-5555-5555-555555555002",
    culture: "55555555-5555-5555-5555-555555555003",
  },
  tags: {
    rajasthan: "66666666-6666-6666-6666-666666666001",
    wildlife: "66666666-6666-6666-6666-666666666002",
    heritage: "66666666-6666-6666-6666-666666666003",
    desert: "66666666-6666-6666-6666-666666666004",
  },
} as const;

export const blogCategories: BlogCategory[] = [
  { id: IDS.categories.travelTips, name: "Travel Tips", slug: "travel-tips", created_at: "2026-01-10T08:00:00Z" },
  { id: IDS.categories.destinations, name: "Locations", slug: "destinations", created_at: "2026-01-10T08:00:00Z" },
  { id: IDS.categories.culture, name: "Culture & Heritage", slug: "culture-heritage", created_at: "2026-01-10T08:00:00Z" },
];

export const blogTags: BlogTag[] = [
  { id: IDS.tags.rajasthan, name: "Rajasthan", slug: "rajasthan" },
  { id: IDS.tags.wildlife, name: "Wildlife", slug: "wildlife" },
  { id: IDS.tags.heritage, name: "Heritage", slug: "heritage" },
  { id: IDS.tags.desert, name: "Desert Safari", slug: "desert-safari" },
];

export const itineraries: Itinerary[] = [
  {
    id: IDS.itineraries.jaipur,
    package_name: "3 Days Jaipur Heritage Tour",
    destination: "Jaipur",
    slug: "3-days-jaipur-heritage",
    pdf_url: "/uploads/itineraries/jaipur-heritage.pdf",
    cover_image_url: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80",
    package_type: "Local Sight Seeing",
    package_duration: "3 Days 2 Nights",
    show_on_website: true,
    is_trending: true,
    display_mode: "grid",
    status: "active",
    download_count: 142,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-06-20T14:30:00Z",
  },
  {
    id: IDS.itineraries.goldenTriangle,
    package_name: "5 Days Golden Triangle",
    destination: "Delhi · Agra · Jaipur",
    slug: "5-days-golden-triangle",
    pdf_url: "/uploads/itineraries/golden-triangle.pdf",
    cover_image_url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80",
    package_type: "Domestic",
    package_duration: "5 Days 4 Nights",
    show_on_website: true,
    is_trending: true,
    display_mode: "grid",
    status: "active",
    download_count: 218,
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-06-22T09:15:00Z",
  },
  {
    id: IDS.itineraries.jaisalmer,
    package_name: "4 Days Jaisalmer Desert Safari",
    destination: "Jaisalmer",
    slug: "4-days-jaisalmer-desert",
    pdf_url: "/uploads/itineraries/jaisalmer-desert.pdf",
    cover_image_url: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80",
    package_type: "Family Trip",
    package_duration: "4 Days 3 Nights",
    show_on_website: true,
    is_trending: false,
    display_mode: "grid",
    status: "active",
    download_count: 96,
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-06-18T11:00:00Z",
  },
  {
    id: IDS.itineraries.udaipur,
    package_name: "3 Days Udaipur Lakes & Palaces",
    destination: "Udaipur",
    slug: "3-days-udaipur-lakes",
    pdf_url: "/uploads/itineraries/udaipur-lakes.pdf",
    cover_image_url: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80",
    package_type: "Honeymoon",
    package_duration: "3 Days 2 Nights",
    show_on_website: true,
    is_trending: true,
    display_mode: "list",
    status: "active",
    download_count: 87,
    created_at: "2026-02-10T10:00:00Z",
    updated_at: "2026-06-25T16:45:00Z",
  },
  {
    id: IDS.itineraries.ranthambore,
    package_name: "2 Days Ranthambore Wildlife",
    destination: "Ranthambore",
    slug: "2-days-ranthambore-wildlife",
    pdf_url: "/uploads/itineraries/ranthambore-wildlife.pdf",
    cover_image_url: "https://images.unsplash.com/photo-1561731216-c3a4d994f935?w=800&q=80",
    package_type: "Local Sight Seeing",
    package_duration: "2 Days 1 Nights",
    show_on_website: false,
    is_trending: false,
    display_mode: "grid",
    status: "inactive",
    download_count: 34,
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-06-10T08:00:00Z",
  },
];

export const itineraryDownloads: ItineraryDownload[] = [
  {
    id: "22222222-2222-2222-2222-222222222001",
    itinerary_id: IDS.itineraries.goldenTriangle,
    customer_name: "Priya Sharma",
    email: "priya.sharma@gmail.com",
    phone: "+91 98765 43210",
    destination: "Delhi · Agra · Jaipur",
    package_name: "5 Days Golden Triangle",
    source_page: "/packages/golden-triangle",
    downloaded_at: "2026-07-05T09:12:00Z",
    synced_to_crm: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222002",
    itinerary_id: IDS.itineraries.jaipur,
    customer_name: "Rahul Mehta",
    email: "rahul.m@gmail.com",
    phone: "+91 87654 32109",
    destination: "Jaipur",
    package_name: "3 Days Jaipur Heritage Tour",
    source_page: "/destinations/jaipur",
    downloaded_at: "2026-07-05T08:45:00Z",
    synced_to_crm: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222003",
    itinerary_id: IDS.itineraries.jaisalmer,
    customer_name: "Anita Desai",
    email: "anita.desai@yahoo.com",
    phone: "+91 76543 21098",
    destination: "Jaisalmer",
    package_name: "4 Days Jaisalmer Desert Safari",
    source_page: "/packages/desert-safari",
    downloaded_at: "2026-07-03T16:30:00Z",
    synced_to_crm: false,
  },
  {
    id: "22222222-2222-2222-2222-222222222004",
    itinerary_id: IDS.itineraries.udaipur,
    customer_name: "James Wilson",
    email: "j.wilson@outlook.com",
    phone: "+44 7700 900123",
    destination: "Udaipur",
    package_name: "3 Days Udaipur Lakes & Palaces",
    source_page: "/destinations/udaipur",
    downloaded_at: "2026-07-03T11:20:00Z",
    synced_to_crm: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222005",
    itinerary_id: IDS.itineraries.goldenTriangle,
    customer_name: "Vikram Singh",
    email: "vikram.s@hotmail.com",
    phone: "+91 99887 76655",
    destination: "Delhi · Agra · Jaipur",
    package_name: "5 Days Golden Triangle",
    source_page: "/homepage",
    downloaded_at: "2026-07-02T14:00:00Z",
    synced_to_crm: true,
  },
];

export const contactQueries: ContactQuery[] = [
  {
    id: "33333333-3333-3333-3333-333333333001",
    name: "Neha Kapoor",
    email: "neha.kapoor@gmail.com",
    mobile: "+91 91234 56789",
    subject: "Group tour enquiry",
    message: "We are a group of 12 people planning a Rajasthan tour in December. Please share customised options.",
    status: "open",
    created_at: "2026-07-05T07:30:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333002",
    name: "Robert Chen",
    email: "r.chen@company.com",
    mobile: "+1 415 555 0192",
    subject: "Corporate retreat",
    message: "Looking for a 4-day corporate retreat package in Jaipur with team-building activities.",
    status: "open",
    created_at: "2026-07-03T15:45:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333003",
    name: "Sunita Verma",
    email: "sunita.v@rediffmail.com",
    mobile: "+91 98765 11122",
    subject: "Honeymoon package",
    message: "Interested in a romantic Udaipur honeymoon package for 5 nights.",
    status: "resolved",
    created_at: "2026-07-01T10:00:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333004",
    name: "Priya Sharma",
    email: "priya.sharma@gmail.com",
    mobile: "+91 98765 43210",
    subject: "Payment query",
    message: "I downloaded the Golden Triangle PDF — can someone call me about booking?",
    status: "open",
    created_at: "2026-06-28T09:20:00Z",
  },
];

export const packageInquiries: PackageInquiry[] = [
  {
    id: "44444444-4444-4444-4444-444444444001",
    customer_name: "Priya Sharma",
    mobile: "+91 98765 43210",
    email: "priya.sharma@gmail.com",
    destination: "Delhi · Agra · Jaipur",
    travel_date: "2026-10-15",
    adults: 2,
    children: 1,
    budget: "₹75,000 – ₹1,00,000",
    additional_requirements: "Need child-friendly hotels and AC transport.",
    status: "quoted",
    source_page: "/packages/golden-triangle",
    created_at: "2026-07-05T09:30:00Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444002",
    customer_name: "Anita Desai",
    mobile: "+91 76543 21098",
    email: "anita.desai@yahoo.com",
    destination: "Jaisalmer",
    travel_date: "2026-11-20",
    adults: 4,
    children: 0,
    budget: "₹1,20,000 – ₹1,50,000",
    additional_requirements: "Desert camp with cultural show preferred.",
    status: "contacted",
    source_page: "/packages/desert-safari",
    created_at: "2026-07-03T17:00:00Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444003",
    customer_name: "James Wilson",
    mobile: "+44 7700 900123",
    email: "j.wilson@outlook.com",
    destination: "Udaipur",
    travel_date: "2026-09-05",
    adults: 2,
    children: 0,
    budget: "₹50,000 – ₹70,000",
    additional_requirements: "Lake-view hotel, English-speaking guide.",
    status: "new",
    source_page: "/destinations/udaipur",
    created_at: "2026-07-03T12:00:00Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444004",
    customer_name: "Rahul Mehta",
    mobile: "+91 87654 32109",
    email: "rahul.m@gmail.com",
    destination: "Jaipur",
    travel_date: "2026-08-10",
    adults: 6,
    children: 2,
    budget: "₹2,00,000+",
    additional_requirements: "Family reunion — need connecting rooms.",
    status: "converted",
    source_page: "/destinations/jaipur",
    created_at: "2026-07-02T08:00:00Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444005",
    customer_name: "Kavita Nair",
    mobile: "+91 99876 54321",
    email: "kavita.nair@gmail.com",
    destination: "Ranthambore",
    travel_date: "2026-12-01",
    adults: 2,
    children: 0,
    budget: "₹30,000 – ₹45,000",
    additional_requirements: "Safari slots for 2 days, photographer friendly.",
    status: "new",
    source_page: "/packages/wildlife",
    created_at: "2026-07-05T06:15:00Z",
  },
];

export const blogs: Blog[] = [
  {
    id: "77777777-7777-7777-7777-777777777001",
    title: "Top 10 Must-Visit Forts in Rajasthan",
    slug: "top-10-forts-rajasthan",
    featured_image_url: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80",
    content_html: "<p>Discover the magnificent forts that define Rajasthan's royal heritage...</p>",
    meta_title: "Top 10 Forts in Rajasthan | Travel Days",
    meta_description: "Explore Amber Fort, Mehrangarh, and more iconic Rajasthan forts.",
    keywords: ["forts", "rajasthan", "heritage", "travel"],
    category_id: IDS.categories.destinations,
    status: "published",
    publish_date: "2026-06-15T10:00:00Z",
    created_at: "2026-06-10T08:00:00Z",
    updated_at: "2026-06-15T10:00:00Z",
  },
  {
    id: "77777777-7777-7777-7777-777777777002",
    title: "Best Time to Visit Jaisalmer Desert",
    slug: "best-time-visit-jaisalmer",
    featured_image_url: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80",
    content_html: "<p>Plan your desert safari with our seasonal guide...</p>",
    meta_title: "Best Time to Visit Jaisalmer | Travel Days",
    meta_description: "October to March is ideal for Jaisalmer desert tours.",
    keywords: ["jaisalmer", "desert", "safari", "weather"],
    category_id: IDS.categories.travelTips,
    status: "published",
    publish_date: "2026-06-20T10:00:00Z",
    created_at: "2026-06-18T08:00:00Z",
    updated_at: "2026-06-20T10:00:00Z",
  },
  {
    id: "77777777-7777-7777-7777-777777777003",
    title: "Rajasthan Food Guide for First-Time Visitors",
    slug: "rajasthan-food-guide",
    featured_image_url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80",
    content_html: "<p>From dal baati churma to ghevar — a culinary journey...</p>",
    meta_title: "Rajasthan Food Guide | Travel Days",
    meta_description: "Must-try Rajasthani dishes for every traveller.",
    keywords: ["food", "culture", "rajasthan"],
    category_id: IDS.categories.culture,
    status: "draft",
    publish_date: null,
    created_at: "2026-07-01T08:00:00Z",
    updated_at: "2026-07-02T14:00:00Z",
  },
];

export const blogTagMap: Record<string, string[]> = {
  "77777777-7777-7777-7777-777777777001": [IDS.tags.rajasthan, IDS.tags.heritage],
  "77777777-7777-7777-7777-777777777002": [IDS.tags.desert, IDS.tags.rajasthan],
  "77777777-7777-7777-7777-777777777003": [IDS.tags.rajasthan, IDS.tags.heritage],
};

export const whatsappLeads: WhatsappLead[] = [
  {
    id: "88888888-8888-8888-8888-888888888001",
    customer_name: "Priya Sharma",
    phone: "+91 98765 43210",
    selected_package: "5 Days Golden Triangle",
    destination: "Delhi · Agra · Jaipur",
    source_page: "/packages/golden-triangle",
    landing_url: "https://traveldaysrajasthan.com/packages/golden-triangle?utm=google",
    created_at: "2026-07-05T09:15:00Z",
    synced_to_crm: true,
  },
  {
    id: "88888888-8888-8888-8888-888888888002",
    customer_name: null,
    phone: "+91 87654 32109",
    selected_package: "3 Days Jaipur Heritage Tour",
    destination: "Jaipur",
    source_page: "/destinations/jaipur",
    landing_url: "https://traveldaysrajasthan.com/destinations/jaipur",
    created_at: "2026-07-05T08:50:00Z",
    synced_to_crm: true,
  },
  {
    id: "88888888-8888-8888-8888-888888888003",
    customer_name: "Anita Desai",
    phone: "+91 76543 21098",
    selected_package: "4 Days Jaisalmer Desert Safari",
    destination: "Jaisalmer",
    source_page: "/packages/desert-safari",
    landing_url: "https://traveldaysrajasthan.com/packages/desert-safari?utm=instagram",
    created_at: "2026-07-03T16:45:00Z",
    synced_to_crm: false,
  },
  {
    id: "88888888-8888-8888-8888-888888888004",
    customer_name: "James Wilson",
    phone: "+44 7700 900123",
    selected_package: "3 Days Udaipur Lakes & Palaces",
    destination: "Udaipur",
    source_page: "/destinations/udaipur",
    landing_url: "https://traveldaysrajasthan.com/destinations/udaipur?utm=facebook",
    created_at: "2026-07-03T11:30:00Z",
    synced_to_crm: true,
  },
];

export const crmSyncLogs: CrmSyncLog[] = [
  { id: "99999999-9999-9999-9999-999999999001", entity_type: "download", entity_id: "22222222-2222-2222-2222-222222222001", status: "success", created_at: "2026-07-04T09:20:00Z" },
  { id: "99999999-9999-9999-9999-999999999002", entity_type: "inquiry", entity_id: "44444444-4444-4444-4444-444444444001", status: "success", created_at: "2026-07-04T09:35:00Z" },
  { id: "99999999-9999-9999-9999-999999999003", entity_type: "whatsapp", entity_id: "88888888-8888-8888-8888-888888888003", status: "failed", created_at: "2026-07-03T17:00:00Z" },
  { id: "99999999-9999-9999-9999-999999999004", entity_type: "contact", entity_id: "33333333-3333-3333-3333-333333333001", status: "pending", created_at: "2026-07-04T07:35:00Z" },
];

export function getDashboardStats(): DashboardStats {
  return {
    totalContactQueries: contactQueries.length,
    totalInquiries: packageInquiries.length,
    totalItineraryDownloads: itineraryDownloads.length,
    totalBlogs: blogs.filter((b) => b.status === "published").length,
    totalWhatsappLeads: whatsappLeads.length,
  };
}

export function getRecentActivity() {
  const items = [
    ...packageInquiries.map((i) => ({
      id: i.id,
      type: "Inquiry" as const,
      title: `${i.customer_name} — ${i.destination}`,
      time: i.created_at,
      status: i.status,
    })),
    ...itineraryDownloads.map((d) => ({
      id: d.id,
      type: "Download" as const,
      title: `${d.customer_name} downloaded ${d.package_name}`,
      time: d.downloaded_at,
      status: d.synced_to_crm ? "synced" : "pending",
    })),
    ...whatsappLeads.map((w) => ({
      id: w.id,
      type: "WhatsApp" as const,
      title: w.customer_name ? `${w.customer_name} — ${w.selected_package}` : `Lead ${w.phone}`,
      time: w.created_at,
      status: w.synced_to_crm ? "synced" : "pending",
    })),
    ...contactQueries.map((c) => ({
      id: c.id,
      type: "Contact" as const,
      title: `${c.name} — ${c.subject ?? "General"}`,
      time: c.created_at,
      status: c.status,
    })),
  ];
  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
}

export function getItineraryById(id: string) {
  return itineraries.find((i) => i.id === id);
}

export function getDownloadsForItinerary(itineraryId: string) {
  return itineraryDownloads.filter((d) => d.itinerary_id === itineraryId);
}

export function getInquiriesByEmail(email: string) {
  return packageInquiries.filter((i) => i.email === email);
}

export function getCategoryName(id: string | null) {
  if (!id) return "—";
  return blogCategories.find((c) => c.id === id)?.name ?? "—";
}

export function getTagsForBlog(blogId: string) {
  const tagIds = blogTagMap[blogId] ?? [];
  return blogTags.filter((t) => tagIds.includes(t.id));
}
