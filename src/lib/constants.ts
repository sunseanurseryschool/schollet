import type { Grade, Section } from "@/types/database";

export const GRADES: Grade[] = ["PreKG", "LKG", "UKG", "1", "2", "3", "4", "5"];

export const SECTIONS: Section[] = ["A", "B", "C"];

export const APP_NAME = "Schollet";
export const APP_TAGLINE = "Smart Finance for Schools";

// Academic year options: 2 years back to 2 years forward
const _currentYear = new Date().getFullYear();
export const ACADEMIC_YEARS: string[] = Array.from({ length: 5 }, (_, i) => {
  const y = _currentYear - 2 + i;
  return `${y}-${y + 1}`;
});

export function getCurrentAcademicYear(): string {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}
