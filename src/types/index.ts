export type Role = "WORKER" | "TREASURER" | "ADMIN" | "SUPER_ADMIN";

export type ReportStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PAID";

export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED";

export const EXPENSE_CATEGORIES = [
  { value: "BUS", label: "Bus", icon: "🚌" },
  { value: "TAXI", label: "Taxi", icon: "🚕" },
  { value: "TRAVEL_MISC", label: "Travel Miscellaneous", icon: "🧳" },
  { value: "MILEAGE", label: "Mileage/KM", icon: "📏" },
  { value: "PHONE", label: "Phone", icon: "📱" },
  { value: "INTERNET", label: "Internet", icon: "🌐" },
  { value: "ELECTRICITY", label: "Electricity", icon: "💡" },
  { value: "GAS", label: "Gas", icon: "🔥" },
  { value: "WATER", label: "Water", icon: "💧" },
  { value: "HOSPITALITY", label: "Hospitality/Table Cost", icon: "🍽️" },
  { value: "RENT", label: "Rent Assistance/Building Fees", icon: "🏠" },
  { value: "EQUIPMENT", label: "Equipment", icon: "💻" },
  { value: "BOOKS", label: "Books", icon: "📚" },
  { value: "PASSPORT", label: "Passport/Residence Permit", icon: "🛂" },
  { value: "OTHER", label: "Other Expenses", icon: "📋" },
] as const;

export const REPORT_STATUSES: {
  value: ReportStatus;
  label: string;
  color: string;
}[] = [
  { value: "DRAFT", label: "Draft", color: "bg-gray-100 text-gray-800" },
  { value: "SUBMITTED", label: "Submitted", color: "bg-blue-100 text-blue-800" },
  { value: "UNDER_REVIEW", label: "Under Review", color: "bg-yellow-100 text-yellow-800" },
  { value: "APPROVED", label: "Approved", color: "bg-green-100 text-green-800" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-800" },
  { value: "PAID", label: "Paid", color: "bg-emerald-100 text-emerald-800" },
];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface OCRResult {
  date: string | null;
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  paymentMethod: string | null;
  suggestedCategory: string | null;
  confidence: number;
  rawText: string;
}

export interface Rule {
  id: string;
  key: string;
  name: string;
  description: string;
  type: string;
  value: number;
  unit: string;
  active: boolean;
}

export interface ValidationWarning {
  type: "missing_receipt" | "duplicate" | "old_expense" | "cap_exceeded";
  message: string;
  severity: "warning" | "error";
}
