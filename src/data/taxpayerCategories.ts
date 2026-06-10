import type { TaxpayerCategory } from "../tax-engine/types";

export interface CategoryOption {
  value: TaxpayerCategory;
  label: string;
}

export const TAXPAYER_CATEGORIES: CategoryOption[] = [
  { value: "general",                     label: "General Taxpayer" },
  { value: "female",                      label: "Female Taxpayer" },
  { value: "senior",                      label: "Senior Citizen (65+)" },
  { value: "disabled",                    label: "Disabled Person" },
  { value: "freedomFighter",              label: "Freedom Fighter (Gazetted)" },
  { value: "thirdGender",                 label: "Third Gender" },
  { value: "julyWarrior",                 label: "July Warrior (Injured)" },
  { value: "disabledChildParentGuardian", label: "Parent/Guardian of Disabled Child" },
];
