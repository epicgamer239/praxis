import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AttributeType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ATTRIBUTE_TEXT: Record<AttributeType, string> = {
  neighborhood: 'text-attribute-neighborhood',
  energy: 'text-attribute-energy',
  social: 'text-attribute-social',
  wisdom: 'text-attribute-wisdom',
};

export const ATTRIBUTE_BG: Record<AttributeType, string> = {
  neighborhood: 'bg-attribute-neighborhood',
  energy: 'bg-attribute-energy',
  social: 'bg-attribute-social',
  wisdom: 'bg-attribute-wisdom',
};

/** Compass letter for each tip. */
export const ATTRIBUTE_COMPASS: Record<AttributeType, 'N' | 'E' | 'S' | 'W'> = {
  neighborhood: 'N',
  energy: 'E',
  social: 'S',
  wisdom: 'W',
};
