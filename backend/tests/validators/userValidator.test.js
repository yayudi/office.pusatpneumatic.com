import { jest } from '@jest/globals';
import { updateProfileSchema } from '../../validators/userValidator.js';

describe('User Validator', () => {
  it('should pass with valid currentPassword', () => {
    const data = { currentPassword: 'password123' };
    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should pass with valid nickname and currentPassword', () => {
    const data = { currentPassword: 'password123', nickname: 'John Doe' };
    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should fail if currentPassword is empty', () => {
    const data = { currentPassword: '' };
    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should pass with valid newPassword', () => {
    const data = { currentPassword: 'old', newPassword: 'newpassword123' };
    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should fail if newPassword is too short (less than 6 chars)', () => {
    const data = { currentPassword: 'old', newPassword: '123' }; // min 6
    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
  
  it('should pass if newPassword is an empty string (allowed via literal or)', () => {
    const data = { currentPassword: 'old', newPassword: '' };
    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
