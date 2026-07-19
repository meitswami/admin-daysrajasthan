/** Dummy payment instruments — replace with real admin-managed details later. */
export const DUMMY_PAYMENT_DETAILS = {
  bank: {
    account_name: "Travel Days Rajasthan Pvt Ltd",
    bank_name: "State Bank of India",
    account_number: "XXXXXXXXXXXX4521",
    ifsc: "SBIN0001234",
    branch: "MI Road, Jaipur",
  },
  upi_ids: ["daysrajasthan@sbi", "traveldays@upi"] as const,
  qr_image_src: "/payment-qr-placeholder.svg",
} as const;

export type AdvancePercent = 20 | 30;

export function clampAdvancePercent(value: unknown): AdvancePercent {
  return value === 30 ? 30 : 20;
}
