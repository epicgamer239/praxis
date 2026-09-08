import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AttributeType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ATTRIBUTE_TEXT: Record<AttributeType, string> = {
  wisdom: 'text-attribute-wisdom',
  social: 'text-attribute-social',
  civic: 'text-attribute-civic',
  vitality: 'text-attribute-vitality',
};