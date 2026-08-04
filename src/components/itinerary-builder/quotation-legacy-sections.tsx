"use client";

import { useEffect, useState } from "react";
import type { ReportBrand } from "@/lib/branding/report-brand";
import type { PreviewContact } from "@/lib/itinerary-builder/policy-master";
import {
  listMasterPolicies,
  policiesForSection,
} from "@/lib/master-data/policies-store";
import type { PaymentDetails } from "@/lib/itinerary-builder/payment-details";
import type { CompanyAchievement, CompanyStructure } from "@/types/company-structure";
import {
  DEFAULT_ACHIEVEMENT_DESCRIPTION,
  DEFAULT_ACHIEVEMENT_IMAGES,
  DEFAULT_ACHIEVEMENT_NAME,
} from "@/types/company-structure";
import { FileText, RotateCcw, Wallet } from "lucide-react";

const LEGACY = {
  explore: "/theme-assets/legacy/explore-2.svg",
  banner0: "/theme-assets/legacy/banner-0.svg",
  banner6: "/theme-assets/legacy/banner-6.svg",
  paymentsCta: "/theme-assets/legacy/payments-cta.svg",
  paymentBg: "/theme-assets/legacy/payment-bg.png",
  paymentDeco: "/theme-assets/legacy/payment-deco.svg",
  phoneFrame: "/theme-assets/legacy/phone-frame.png",
  mandala: "/theme-assets/legacy/mandala.png",
  upi: "/theme-assets/legacy/upi.svg",
  phonepe: "/theme-assets/legacy/phonepe.svg",
  paytm: "/theme-assets/legacy/paytm.svg",
  amazonpay: "/theme-assets/legacy/amazonpay.svg",
  bharatpe: "/theme-assets/legacy/bharatpe.svg",
} as const;

function PolicyBlock({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div className="break-inside-avoid">
      <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-[#F5C518] px-3 py-1.5 text-sm font-bold text-white">
        {icon}
        {title}
      </div>
      <ul className="space-y-2 pl-1 text-sm leading-relaxed text-stone-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5C518]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function achievementCards(structure: CompanyStructure | null): CompanyAchievement[] {
  const list = structure?.achievements?.filter((a) => a.name.trim()) ?? [];
  if (list.length > 0) return list;
  return [
    {
      id: "default-ach",
      name: DEFAULT_ACHIEVEMENT_NAME,
      description: DEFAULT_ACHIEVEMENT_DESCRIPTION,
      image_urls: [...DEFAULT_ACHIEVEMENT_IMAGES],
    },
  ];
}

export function QuotationLegacyExploreBanner() {
  return (
    <div className="w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LEGACY.explore} alt="" className="block h-auto w-full object-cover md:object-contain" />
    </div>
  );
}

export function QuotationLegacyPolicies({
  inclusions,
  exclusions,
  companyName,
}: {
  inclusions: string[];
  exclusions: string[];
  companyName: string;
}) {
  const [terms, setTerms] = useState<string[]>([]);
  const [cancellation, setCancellation] = useState<string[]>([]);
  const [payment, setPayment] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listMasterPolicies()
      .then((rows) => {
        if (cancelled) return;
        setTerms(policiesForSection(rows, "terms").map((t) => t.title));
        setCancellation(policiesForSection(rows, "cancellation").map((t) => t.title));
        setPayment(policiesForSection(rows, "payment").map((t) => t.title));
      })
      .catch(() => {
        if (cancelled) return;
        setTerms([]);
        setCancellation([]);
        setPayment([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="break-inside-avoid space-y-8 bg-white px-6 py-10">
      <div className="mx-auto mb-2 flex justify-center">
        <div className="rounded-md bg-[#F5C518] px-6 py-2 text-center text-lg font-bold text-white">
          {companyName}
        </div>
      </div>

      {(inclusions.length > 0 || exclusions.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {inclusions.length > 0 && (
            <PolicyBlock
              title="Package Inclusions :"
              icon={<FileText className="h-4 w-4" />}
              items={inclusions}
            />
          )}
          {exclusions.length > 0 && (
            <PolicyBlock
              title="Package Exclusions :"
              icon={<FileText className="h-4 w-4" />}
              items={exclusions}
            />
          )}
        </div>
      )}

      {terms.length > 0 && (
        <PolicyBlock
          title="Terms & Conditions :"
          icon={<FileText className="h-4 w-4" />}
          items={terms}
        />
      )}
      {cancellation.length > 0 && (
        <PolicyBlock
          title="Cancellation & Refund Policy :"
          icon={<RotateCcw className="h-4 w-4" />}
          items={cancellation}
        />
      )}
      {payment.length > 0 && (
        <PolicyBlock
          title="Payment Policy :"
          icon={<Wallet className="h-4 w-4" />}
          items={payment}
        />
      )}
    </section>
  );
}

export function QuotationLegacyAbout({
  structure,
  brand,
}: {
  structure: CompanyStructure | null;
  brand: ReportBrand;
}) {
  const ach = achievementCards(structure)[0];
  const title = ach?.name || DEFAULT_ACHIEVEMENT_NAME;
  const description =
    ach?.description ||
    brand.siteDescription ||
    DEFAULT_ACHIEVEMENT_DESCRIPTION;
  const images =
    ach?.image_urls?.filter(Boolean).length
      ? ach.image_urls.filter(Boolean)
      : [...DEFAULT_ACHIEVEMENT_IMAGES];

  const paragraphs = description.split(/\n\n+/).filter(Boolean);

  return (
    <section className="break-inside-avoid space-y-8 bg-white px-6 py-10">
      <div>
        <h2 className="text-xl font-bold text-stone-900 sm:text-2xl">{title}</h2>
        <div className="mt-4 grid gap-4 text-sm leading-relaxed text-stone-700 sm:grid-cols-2">
          {paragraphs.length >= 2 ? (
            <>
              <p className="whitespace-pre-wrap">{paragraphs[0]}</p>
              <p className="whitespace-pre-wrap">{paragraphs.slice(1).join("\n\n")}</p>
            </>
          ) : (
            <p className="whitespace-pre-wrap sm:col-span-2">{description}</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-stone-900 underline decoration-[#F5C518] decoration-2 underline-offset-4">
          Achievements
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {images.slice(0, 3).map((src, i) => (
            <div key={`${src}-${i}`} className="overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="achievement" className="h-44 w-full object-cover md:h-52" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg bg-[#E8C96A] px-4 py-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LEGACY.mandala}
          alt=""
          className="pointer-events-none absolute -left-16 -top-16 w-44 opacity-40"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LEGACY.mandala}
          alt=""
          className="pointer-events-none absolute -bottom-16 -right-16 w-44 opacity-40"
        />
        <div className="relative flex justify-center">
          <a
            href={brand.websiteUrl || "https://www.rajasthantouring.com"}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-stone-800 shadow-sm"
          >
            Click To View About Our Travel Agency
          </a>
        </div>
      </div>
    </section>
  );
}

export function QuotationLegacyPaymentSection({
  payment,
  agent,
  website,
  brandLogo,
  bookNowHref,
}: {
  payment: PaymentDetails;
  agent: PreviewContact | null;
  website: string;
  brandLogo: string | null;
  bookNowHref?: string | null;
}) {
  const upiId = payment.upi_ids[0] ?? "";
  const logo = brandLogo || "/structure-company-logo.png";

  return (
    <section className="break-inside-avoid">
      <div className="relative w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LEGACY.paymentsCta}
          alt=""
          className="block h-auto w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-bold tracking-[0.2em] text-white sm:text-base">
            GO AHEAD WITH THE
          </p>
          <p className="mt-1 text-3xl font-extrabold text-[#F5C518] sm:text-5xl">PAYMENTS</p>
        </div>
      </div>

      <div className="relative grid gap-8 bg-white px-4 py-10 sm:grid-cols-2 sm:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LEGACY.paymentBg}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
        />

        <div className="relative mx-auto w-full max-w-[280px]">
          <div className="relative overflow-hidden rounded-[2rem] border-[10px] border-stone-900 bg-white shadow-xl">
            <div className="flex flex-col items-center px-4 pb-4 pt-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="Company Logo" className="h-14 object-contain sm:h-16" />
              <p className="mt-3 text-xs font-semibold text-stone-800">Scan & Pay using Payment App</p>
              <div className="mt-3 aspect-square w-full max-w-[180px] overflow-hidden rounded-lg border border-stone-200 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={payment.qr_image_src}
                  alt="UPI QR"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {[LEGACY.upi, LEGACY.phonepe, LEGACY.paytm, LEGACY.amazonpay, LEGACY.bharatpe].map(
                  (src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
                  )
                )}
              </div>
              <p className="mt-3 text-[9px] text-stone-400">
                © {new Date().getFullYear()}, All rights reserved.
              </p>
            </div>
          </div>
        </div>

        <div className="relative space-y-5">
          <p className="font-serif text-lg text-[#C45C26]">खम्मा घणी</p>

          <div>
            <div className="mb-2 inline-block rounded-md bg-[#F5C518] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Bank Transfer
            </div>
            <dl className="space-y-1.5 text-sm text-stone-800">
              <div>
                <dt className="inline font-semibold">Bank Name: </dt>
                <dd className="inline">{payment.bank.bank_name}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Account No.: </dt>
                <dd className="inline">{payment.bank.account_number}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Account Name: </dt>
                <dd className="inline">{payment.bank.account_name}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">IFSC Code: </dt>
                <dd className="inline">{payment.bank.ifsc}</dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="mb-2 inline-block rounded-md bg-[#F5C518] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              UPI - Payment
            </div>
            <dl className="space-y-1.5 text-sm text-stone-800">
              <div>
                <dt className="inline font-semibold">Name: </dt>
                <dd className="inline">{payment.upi_receiver_name || payment.bank.account_name}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Email: </dt>
                <dd className="inline break-all">{upiId}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">UPI ID: </dt>
                <dd className="inline break-all">{upiId}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Mo. :- </dt>
                <dd className="inline">{payment.upi_mobile || "+91 9588911614"}</dd>
              </div>
            </dl>
          </div>

          <a
            href={bookNowHref || "#book"}
            className="inline-flex rounded-md bg-[#F5C518] px-8 py-2.5 text-sm font-bold text-white shadow-sm"
          >
            Book Now
          </a>
        </div>
      </div>

      <footer className="relative overflow-hidden bg-[#3D2914] px-6 py-10 text-[#F5C518]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LEGACY.paymentDeco}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <a
            href={`https://${website.replace(/^https?:\/\//i, "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold hover:underline"
          >
            {website}
          </a>
          {agent && (
            <div className="text-right text-sm leading-relaxed">
              <p className="font-bold">{agent.name}</p>
              <p>{agent.phone}</p>
              <p className="break-all">{agent.email}</p>
            </div>
          )}
        </div>
      </footer>
    </section>
  );
}
