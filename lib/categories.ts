import type { Category } from './types';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'relationship', label: 'Relationship' },
  { value: 'money', label: 'Money' },
  { value: 'family', label: 'Family' },
  { value: 'work', label: 'Work/Career' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'education', label: 'Education' },
];

export function categoryLabel(value: Category): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
