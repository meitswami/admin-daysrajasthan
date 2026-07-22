/** Company Structure master — branding, contacts, bank & UPI */

export type StaffContact = {
  id: string;
  name: string;
  emails: string;
  mobiles: string;
};

export type CompanyAddress = {
  id: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
};

export type SocialLinks = {
  facebook: string;
  instagram: string;
  youtube: string;
  website: string;
};

export type BankAccount = {
  id: string;
  bank_name: string;
  ifsc_code: string;
  account_name: string;
  account_number: string;
  account_type: string;
};

export type PaymentMethod = {
  id: string;
  type: string;
  upi_id: string;
  receiver_name: string;
  mobile_number: string;
  qr_image_url: string | null;
};

export type CompanyAchievement = {
  id: string;
  name: string;
  description: string;
  image_urls: string[];
};

export type CompanyStructure = {
  logo_url: string | null;
  staff_contacts: StaffContact[];
  addresses: CompanyAddress[];
  social_links: SocialLinks;
  support_number: string;
  bank_accounts: BankAccount[];
  payment_methods: PaymentMethod[];
  achievements: CompanyAchievement[];
  updated_at: string;
};

export const DEFAULT_COMPANY_LOGO_URL =
  "https://apitour.rajasthantouring.in/uploads/1762848817275-752878275-Full_Logo.jpeg-removebg-preview.png";

export const DEFAULT_ACHIEVEMENT_IMAGES = [
  "/structure-achievement-leisure.png",
  "/structure-achievement-honeymoon.png",
  "/structure-achievement-family.png",
] as const;

export const DEFAULT_ACHIEVEMENT_NAME =
  "Rajasthan Touring – Crafting Royal Journeys Since 2013";

export const DEFAULT_ACHIEVEMENT_DESCRIPTION = `Founded in 2013, Rajasthan Touring has grown into one of the most trusted and recognized travel brands in Rajasthan. With over a decade of excellence, we have proudly delivered 50,000+ unforgettable travel experiences across the royal state and beyond. From the majestic forts and golden deserts to heritage stays and local traditions, our tours reflect the authentic soul of Rajasthan. Over the years, we’ve expanded our offerings to include customized Rajasthan packages, car rentals, hotel bookings, desert camping, and South India tours, while maintaining our signature focus on comfort, culture, and hospitality.

Our dedication has earned us multiple accolades including the TripAdvisor Travelers’ Choice Award, ET Travel Recognition, and the title of Trusted Travel Network of India. Featured in Lonely Planet and showcased at World Travel Mart London, Rajasthan Touring continues to set benchmarks in sustainable and experiential travel. With a passionate team and glowing reviews from happy travelers worldwide, we remain committed to showcasing the timeless heritage of Rajasthan — turning every trip into a lifetime memory.`;
