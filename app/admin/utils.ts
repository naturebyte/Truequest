import type { WebinarRegistrationRecord } from "./types";

export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function formatDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(value: number): string {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

export function getAgeFromDateOfBirth(value: string): string {
  const dateOfBirth = new Date(value);
  if (Number.isNaN(dateOfBirth.getTime())) {
    return "-";
  }

  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDifference = today.getMonth() - dateOfBirth.getMonth();
  const hasBirthdayPassedThisYear =
    monthDifference > 0 ||
    (monthDifference === 0 && today.getDate() >= dateOfBirth.getDate());

  if (!hasBirthdayPassedThisYear) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "-";
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  const directDateMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  if (directDateMatch) {
    return trimmed;
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

export async function downloadWebinarRegistrationsExcel(
  rows: WebinarRegistrationRecord[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const sheetRows = rows.map((row) => ({
    "Webinar title": row.webinar_title || "Unassigned webinar",
    "Webinar date": row.webinar_date ? formatDate(row.webinar_date) : "",
    "Webinar time": row.webinar_time ? row.webinar_time.slice(0, 5) : "",
    Name: row.name,
    Phone: row.phone_number,
    Email: row.email_id,
    Qualification: row.qualification,
    "Submitted on": formatDate(row.created_at),
  }));
  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `webinar-registrations-${stamp}.xlsx`);
}
