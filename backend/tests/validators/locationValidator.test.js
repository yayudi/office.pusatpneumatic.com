import { jest } from '@jest/globals';
import { locationSchema } from '../../validators/locationValidator.js';

describe('Location Validator', () => {
  it('should pass with valid data (including number to string transform)', () => {
    const validData = {
      code: 'WH-01',
      building: 'A',
      floor: 1, // numeric floor should be cast to string
      name: 'Main Warehouse',
      purpose: 'WAREHOUSE'
    };
    
    const result = locationSchema.safeParse(validData);
    expect(result.success).toBe(true);
    expect(result.data.floor).toBe('1');
  });

  it('should pass with minimum required fields', () => {
    const minData = {
      code: 'A',
      building: 'B',
      purpose: 'DISPLAY'
    };
    const result = locationSchema.safeParse(minData);
    expect(result.success).toBe(true);
    expect(result.data.floor).toBeNull(); // nullable & optional defaults
  });

  it('should fail when code is missing or empty', () => {
    const result1 = locationSchema.safeParse({ building: 'A', purpose: 'STORAGE' });
    const result2 = locationSchema.safeParse({ code: '', building: 'A', purpose: 'STORAGE' });
    
    expect(result1.success).toBe(false);
    expect(result2.success).toBe(false);
  });

  it('should fail with invalid purpose', () => {
    const invalidData = {
      code: 'WH',
      building: 'A',
      purpose: 'INVALID_PURPOSE'
    };
    const result = locationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('Invalid option');
  });
});
