import { jest } from '@jest/globals';
import { getProductsWithFilters } from '../../repositories/productRepository.js';

describe('Product Repository', () => {
  let mockConnection;

  beforeEach(() => {
    // Create a mock database connection
    mockConnection = {
      query: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductsWithFilters', () => {
    it('should build a simple query when no complex filters are provided', async () => {
      // Setup mock return value
      mockConnection.query.mockResolvedValueOnce([[{ total: 0 }], []]); // total rows (1st query)
      mockConnection.query.mockResolvedValueOnce([[], []]); // products (2nd query)

      const filters = {
        limit: 10,
        offset: 0,
        status: 'active'
      };

      await getProductsWithFilters(mockConnection, filters);

      // Verify that query was called
      expect(mockConnection.query).toHaveBeenCalledTimes(2); // Once for data, once for total
      
      const [countQuery, countParams] = mockConnection.query.mock.calls[0];
      const [dataQuery, dataParams] = mockConnection.query.mock.calls[1];

      // Validate SQL constraints
      expect(dataQuery).toContain('LIMIT ? OFFSET ?');
      expect(dataParams).toEqual(expect.arrayContaining([10, 0]));
      expect(countQuery).toContain('SELECT COUNT(DISTINCT p.id) as total');
    });

    it('should apply search parameter correctly using parameterized queries', async () => {
      mockConnection.query.mockResolvedValueOnce([[{ total: 0 }], []]); // 1st count
      mockConnection.query.mockResolvedValueOnce([[], []]); // 2nd products

      const filters = {
        limit: 20,
        offset: 0,
        search: 'Laptop',
        searchBy: 'name',
        status: 'all'
      };

      await getProductsWithFilters(mockConnection, filters);

      const [dataQuery, dataParams] = mockConnection.query.mock.calls[1];
      
      expect(dataQuery).toContain('p.name LIKE ?');
      expect(dataParams).toContain('%Laptop%');
    });

    it('should apply category array filtering correctly', async () => {
      mockConnection.query.mockResolvedValueOnce([[{ total: 0 }], []]);
      mockConnection.query.mockResolvedValueOnce([[], []]);

      const filters = {
        limit: 10,
        offset: 0,
        categoryInclude: [1, 2, 3],
        status: 'active'
      };

      await getProductsWithFilters(mockConnection, filters);

      const [dataQuery, dataParams] = mockConnection.query.mock.calls[1];
      
      expect(dataQuery).toContain('p.category_id IN (?)');
      // In node-mysql2, arrays passed to `?` are flattened
      expect(dataParams).toContainEqual([1, 2, 3]);
    });
  });
});
