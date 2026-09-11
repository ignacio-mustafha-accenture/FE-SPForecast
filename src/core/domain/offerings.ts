export const OFFERING_OPTIONS = [
  { value: 'SO', label: 'SO' },
  { value: 'PR', label: 'PR' },
  { value: 'Tools', label: 'Tools' },
  { value: 'S4', label: 'S4' },
  { value: 'Ariba', label: 'Ariba' },
  { value: 'Oracle', label: 'Oracle' },
];

export type Offering = typeof OFFERING_OPTIONS[number]['value'];