import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('combines conditional classes and resolves Tailwind conflicts', () => {
    expect(cn('px-2 py-2', false && 'hidden', 'px-4')).toBe('py-2 px-4');
  });
});
