import { jest } from '@jest/globals';
import { 
  getUserByUsername, 
  getUserById, 
  getRoleAndPermissions, 
  updateProfile, 
  getUserLocations 
} from '../../repositories/userRepository.js';

describe('User Repository', () => {
  let mockConnection;

  beforeEach(() => {
    mockConnection = {
      query: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByUsername', () => {
    it('should return user object if found', async () => {
      const mockUser = { id: 1, username: 'admin' };
      mockConnection.query.mockResolvedValueOnce([[mockUser], []]);

      const result = await getUserByUsername(mockConnection, 'admin');

      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM users WHERE username = ?', ['admin']);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockConnection.query.mockResolvedValueOnce([[], []]);

      const result = await getUserByUsername(mockConnection, 'unknown');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user object if found', async () => {
      const mockUser = { id: 1, username: 'admin' };
      mockConnection.query.mockResolvedValueOnce([[mockUser], []]);

      const result = await getUserById(mockConnection, 1);

      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockConnection.query.mockResolvedValueOnce([[], []]);

      const result = await getUserById(mockConnection, 999);

      expect(result).toBeNull();
    });
  });

  describe('getRoleAndPermissions', () => {
    it('should format role and permissions array correctly', async () => {
      const mockRows = [
        { role: 'admin', permission: 'view-users' },
        { role: 'admin', permission: 'edit-users' }
      ];
      mockConnection.query.mockResolvedValueOnce([mockRows, []]);

      const result = await getRoleAndPermissions(mockConnection, 1);

      expect(mockConnection.query).toHaveBeenCalledTimes(1);
      expect(result.role).toBe('admin');
      expect(result.permissions).toEqual(['view-users', 'edit-users']);
    });

    it('should filter out null permissions', async () => {
      const mockRows = [
        { role: 'user', permission: null }
      ];
      mockConnection.query.mockResolvedValueOnce([mockRows, []]);

      const result = await getRoleAndPermissions(mockConnection, 2);

      expect(result.role).toBe('user');
      expect(result.permissions).toEqual([]);
    });
  });

  describe('updateProfile', () => {
    it('should update only nickname if provided', async () => {
      await updateProfile(mockConnection, 1, { nickname: 'NewNick' });

      expect(mockConnection.query).toHaveBeenCalledTimes(1);
      const [query, params] = mockConnection.query.mock.calls[0];
      
      expect(query).toContain('nickname = ?');
      expect(query).not.toContain('password_hash = ?');
      expect(params).toEqual(['NewNick', 1]);
    });

    it('should update both nickname and password if provided', async () => {
      await updateProfile(mockConnection, 1, { nickname: 'NewNick', hashedNewPassword: 'hash' });

      expect(mockConnection.query).toHaveBeenCalledTimes(1);
      const [query, params] = mockConnection.query.mock.calls[0];
      
      expect(query).toContain('nickname = ?');
      expect(query).toContain('password_hash = ?');
      expect(params).toEqual(['NewNick', 'hash', 1]);
    });

    it('should not execute query if no updates provided', async () => {
      await updateProfile(mockConnection, 1, {});

      expect(mockConnection.query).not.toHaveBeenCalled();
    });
  });

  describe('getUserLocations', () => {
    it('should return locations for a user', async () => {
      const mockLocations = [{ id: 1, code: 'LTC', name: 'LTC Glodok' }];
      mockConnection.query.mockResolvedValueOnce([mockLocations, []]);

      const result = await getUserLocations(mockConnection, 1);

      expect(mockConnection.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockLocations);
    });
  });
});
