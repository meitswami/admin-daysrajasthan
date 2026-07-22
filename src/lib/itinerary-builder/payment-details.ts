import type { CompanyStructure } from "@/types/company-structure";
import { defaultCompanyStructure } from "@/lib/master-data/structure-store";

/** Fallback payment instruments when Structure master is unavailable. */
export const DUMMY_PAYMENT_DETAILS = {
  bank: {
    account_name: "Welcome Rajasthan",
    bank_name: "Bank of India",
    account_number: "748220110000989",
    ifsc: "BKID0007482",
    branch: "Current",
  },
  upi_ids: ["sales.welcomerajasthantours@okicici"] as string[],
  qr_image_src: "/structure-upi-qr.png",
};

export type PaymentDetails = {
  bank: {
    account_name: string;
    bank_name: string;
    account_number: string;
    ifsc: string;
    branch: string;
  };
  upi_ids: readonly string[];
  qr_image_src: string;
};

export type AdvancePercent = 20 | 30;

export function clampAdvancePercent(value: unknown): AdvancePercent {
  return value === 30 ? 30 : 20;
}

/** Map company Structure master → payment UI shape. */
export function paymentDetailsFromStructure(
  structure: CompanyStructure | null | undefined
): PaymentDetails {
  const bank = structure?.bank_accounts?.[0];
  const upi = structure?.payment_methods?.[0];
  if (!bank && !upi) return DUMMY_PAYMENT_DETAILS;

  return {
    bank: {
      account_name: bank?.account_name || DUMMY_PAYMENT_DETAILS.bank.account_name,
      bank_name: bank?.bank_name || DUMMY_PAYMENT_DETAILS.bank.bank_name,
      account_number: bank?.account_number || DUMMY_PAYMENT_DETAILS.bank.account_number,
      ifsc: bank?.ifsc_code || DUMMY_PAYMENT_DETAILS.bank.ifsc,
      branch: DUMMY_PAYMENT_DETAILS.bank.branch,
    },
    upi_ids: upi?.upi_id ? [upi.upi_id] : [...DUMMY_PAYMENT_DETAILS.upi_ids],
    qr_image_src: upi?.qr_image_url || DUMMY_PAYMENT_DETAILS.qr_image_src,
  };
}

/** Sync helper for client components that already loaded Structure. */
export function defaultPaymentDetailsFromSeed(): PaymentDetails {
  return paymentDetailsFromStructure(defaultCompanyStructure());
}
