import {
  LayoutDashboard,
  Map,
  Route,
  MessageSquare,
  FileQuestion,
  BookOpen,
  MessageCircle,
  BarChart3,
  Settings,
  Globe,
  Globe2,
  List,
  CheckCircle2,
  PlusCircle,
  Building2,
  MapPin,
  Car,
  Tags,
  Lightbulb,
  ScrollText,
  Bot,
  Truck,
  ClipboardList,
  TrendingUp,
  FileText,
  CreditCard,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const homeNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Bookings & website overview" },
];

export const bookingNav: NavGroup = {
  label: "Booking",
  items: [
    {
      label: "Regular Itinerary",
      href: "/itinerary-builder/new",
      icon: PlusCircle,
      description: "3-step wizard — client, package, pricing",
    },
    {
      label: "Regular Itinerary List",
      href: "/itinerary-builder",
      icon: List,
      description: "All pending & active quotes",
    },
    {
      label: "All Confirm Booking",
      href: "/itinerary-builder/confirmed",
      icon: CheckCircle2,
      description: "Confirmed bookings only",
    },
  ],
};

export const crmNav: NavGroup = {
  label: "CRM",
  items: [
    { label: "Customer", href: "/customers", icon: MessageSquare, description: "Customer database" },
    { label: "Unified Leads", href: "/leads", icon: MessageCircle, description: "WhatsApp, inquiry & email leads" },
    { label: "Email Details", href: "/itinerary-builder/emails", icon: MessageCircle, description: "Booking email log" },
  ],
};

/** Post-booking operations — transport, cost sheets, P&L, invoices */
export const operationsNav: NavGroup = {
  label: "Operations",
  items: [
    {
      label: "Transportation Sheets",
      href: "/operations/transportation-sheets",
      icon: Truck,
      description: "Driver, vehicle & advance for confirmed bookings",
    },
    {
      label: "Operation Sheet",
      href: "/operations/operation-sheet",
      icon: ClipboardList,
      description: "Booked trips cost sheets",
    },
    {
      label: "Profit & Loss",
      href: "/operations/profit-loss",
      icon: TrendingUp,
      description: "Payments, expenses & net P&L",
    },
    {
      label: "Invoice Bills",
      href: "/operations/invoice-bills",
      icon: FileText,
      description: "Sales, car rental, quotation & all bills",
    },
    {
      label: "Payment Manager",
      href: "/operations/payment-manager",
      icon: CreditCard,
      description: "Regular & final itinerary payments",
    },
  ],
};

/** Master data used by itinerary costing & website CMS */
export const masterDataNav: NavGroup = {
  label: "Master Data",
  items: [
    { label: "Destinations", href: "/master-data/destinations", icon: MapPin, description: "Destination / location master (India)" },
    { label: "Hotels", href: "/master-data/hotels", icon: Building2, description: "Hotel inventory" },
    { label: "Vehicles", href: "/master-data/vehicles", icon: Car, description: "Transport fleet" },
    {
      label: "Itineraries",
      href: "/master-data/itineraries",
      icon: Route,
      description: "Package master with inclusions & images",
    },
    {
      label: "Inclusions & Exclusions",
      href: "/master-data/inclusions-exclusions",
      icon: List,
      description: "Reusable inclusion / exclusion lines",
    },
    { label: "Categories", href: "/master-data/categories", icon: Tags, description: "Hotel category tiers" },
    {
      label: "AI Suggestions",
      href: "/master-data/ai-suggestions",
      icon: Lightbulb,
      description: "Day title & description templates",
    },
    {
      label: "Policies",
      href: "/master-data/policies",
      icon: ScrollText,
      description: "Terms, cancellation & payment",
    },
  ],
};

/** @deprecated use homeNav + bookingNav — kept for search index */
export const mainNav: NavItem[] = [
  ...homeNav,
  { label: "Itinerary Builder", href: "/itinerary-builder", icon: Route },
  { label: "Website Packages", href: "/itineraries", icon: Map },
  { label: "Website CMS", href: "/website", icon: Globe },
  { label: "Contact Queries", href: "/contacts", icon: MessageSquare },
  { label: "Inquiries", href: "/inquiries", icon: FileQuestion },
  { label: "Blog", href: "/blogs", icon: BookOpen },
  { label: "WhatsApp Leads", href: "/whatsapp-leads", icon: MessageCircle },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

/** Top-level module — business reports & exports */
export const reportsNav: NavItem[] = [
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Bookings, payments, inquiries & email reports",
  },
];

export const websiteNav: NavGroup = {
  label: "Website",
  items: [
    { label: "Website Packages", href: "/itineraries", icon: Map },
    { label: "Website CMS", href: "/website", icon: Globe },
    { label: "Contact Queries", href: "/contacts", icon: MessageSquare },
    { label: "Inquiries", href: "/inquiries", icon: FileQuestion },
    { label: "Blog", href: "/blogs", icon: BookOpen },
    { label: "WhatsApp Leads", href: "/whatsapp-leads", icon: MessageCircle },
  ],
};

/** Chat Platform — live AI travel assistant widget */
export const aiChatNav: NavGroup = {
  label: "AI & Chat",
  items: [
    {
      label: "Chat Platform",
      href: "/ai-chat",
      icon: Bot,
      description: "Widget, embed, keys, domains & online AI chat",
    },
  ],
};

export const secondaryNav: NavItem[] = [
  { label: "Staff Management", href: "/staff", icon: Users, description: "Roles, access & password reset" },
  { label: "Web Settings", href: "/web-settings", icon: Globe2, description: "Site name, logo, pages & contact" },
  { label: "Settings", href: "/settings", icon: Settings, description: "Admin panel, SMTP & CRM" },
];

export const allNavItems: NavItem[] = [
  ...homeNav,
  ...bookingNav.items,
  ...crmNav.items,
  ...operationsNav.items,
  ...masterDataNav.items,
  ...reportsNav,
  ...websiteNav.items,
  ...aiChatNav.items,
  ...secondaryNav,
];
