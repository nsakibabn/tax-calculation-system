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
  // disabledChildParentGuardian omitted from UI: threshold requires primary category +
  // disabled-child count as inputs, which this form does not collect. Engine still
  // supports the type; re-add here once those fields are implemented.
];
