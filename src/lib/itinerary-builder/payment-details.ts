import type { CompanyStructure } from "@/types/company-structure";

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
  upi_mobile?: string;
  upi_receiver_name?: string;
};

export type AdvancePercent = 20 | 30;

const EMPTY_PAYMENT_DETAILS: PaymentDetails = {
  bank: {
    account_name: "",
    bank_name: "",
    account_number: "",
    ifsc: "",
    branch: "",
  },
  upi_ids: [],
  qr_image_src: "",
  upi_mobile: "",
  upi_receiver_name: "",
};

/** @deprecated Use empty payment details / Structure DB — kept for import compatibility. */
export const DUMMY_PAYMENT_DETAILS = EMPTY_PAYMENT_DETAILS;

export function clampAdvancePercent(value: unknown): AdvancePercent {
  return value === 30 ? 30 : 20;
}

/** Map company Structure master → payment UI shape. No invented bank/UPI fallbacks. */
export function paymentDetailsFromStructure(
  structure: CompanyStructure | null | undefined
): PaymentDetails {
  const bank = structure?.bank_accounts?.[0];
  const upi = structure?.payment_methods?.[0];
  if (!bank && !upi) return { ...EMPTY_PAYMENT_DETAILS, upi_ids: [] };

  return {
    bank: {
      account_name: bank?.account_name || "",
      bank_name: bank?.bank_name || "",
      account_number: bank?.account_number || "",
      ifsc: bank?.ifsc_code || "",
      branch: bank?.account_type || "",
    },
    upi_ids: upi?.upi_id ? [upi.upi_id] : [],
    qr_image_src: upi?.qr_image_url || "",
    upi_mobile: upi?.mobile_number || "",
    upi_receiver_name: upi?.receiver_name || "",
  };
}

/** Empty payment shell — load real details via getCompanyStructure(). */
export function defaultPaymentDetailsFromSeed(): PaymentDetails {
  return { ...EMPTY_PAYMENT_DETAILS, upi_ids: [] };
}
