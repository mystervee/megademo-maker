import { describe, it, expect } from 'vitest';
import { ensureArray } from './utils.js';

describe('ensureArray', () => {
  it('should return the same array if an array is passed', () => {
    const input = [1, 2, 3];
    const result = ensureArray(input);
    expect(result).toBe(input); // Check reference equality
    expect(result).toEqual([1, 2, 3]);
  });

  it('should return an empty array if an empty array is passed', () => {
    const input = [];
    const result = ensureArray(input);
    expect(result).toBe(input);
    expect(result).toEqual([]);
  });

  it('should return an empty array if undefined is passed', () => {
    expect(ensureArray(undefined)).toEqual([]);
  });

  it('should return an empty array if null is passed', () => {
    expect(ensureArray(null)).toEqual([]);
  });

  it('should return an empty array if a string is passed', () => {
    expect(ensureArray('hello')).toEqual([]);
  });

  it('should return an empty array if a number is passed', () => {
    expect(ensureArray(42)).toEqual([]);
  });

  it('should return an empty array if a boolean is passed', () => {
    expect(ensureArray(true)).toEqual([]);
    expect(ensureArray(false)).toEqual([]);
  });

  it('should return an empty array if an object is passed', () => {
    expect(ensureArray({ a: 1 })).toEqual([]);
  });
});
