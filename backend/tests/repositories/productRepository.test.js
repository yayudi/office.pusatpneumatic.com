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

  describe('searchProducts', () => {
    // Import manually since it's not imported at the top
    let searchProducts;
    
    beforeAll(async () => {
      const repo = await import('../../repositories/productRepository.js');
      searchProducts = repo.searchProducts;
    });

    it('should split keywords and apply AND conditions for order-independent search', async () => {
      mockConnection.query.mockResolvedValueOnce([[], []]);

      await searchProducts(mockConnection, 'Beras Merah', null, 1, 20);

      expect(mockConnection.query).toHaveBeenCalledTimes(1);
      const [query, params] = mockConnection.query.mock.calls[0];

      // Memastikan kondisi AND dan LIKE untuk kedua kata kunci ada di query
      expect(query).toContain('(LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?)');
      expect(query).toContain('AND ((LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?) AND (LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?))');

      // Memastikan param `%Beras%` dan `%Merah%` diparsing dengan benar
      expect(params).toEqual(expect.arrayContaining(['%Beras%', '%Beras%', '%Merah%', '%Merah%', 20, 0]));
    });

    it('should apply location filter if locationId is provided', async () => {
      mockConnection.query.mockResolvedValueOnce([[], []]);

      await searchProducts(mockConnection, 'Beras', 'LOK-01', 2, 10);

      const [query, params] = mockConnection.query.mock.calls[0];

      expect(query).toContain('sl.location_id = ?');
      // Limit 10, offset (2-1)*10 = 10
      expect(params).toEqual(['LOK-01', '%Beras%', '%Beras%', 10, 10]);
    });

    it('should return nextCursor if results length equals limit', async () => {
      // Return 20 items to simulate has next page
      mockConnection.query.mockResolvedValueOnce([new Array(20).fill({}), []]);

      const result = await searchProducts(mockConnection, 'Beras', null, 1, 20);

      expect(result.data.length).toBe(20);
      expect(result.nextCursor).toBe(2); // page 1 + 1
    });

    it('should return nextCursor as null if results length is less than limit', async () => {
      mockConnection.query.mockResolvedValueOnce([[{ id: 1 }], []]);

      const result = await searchProducts(mockConnection, 'Beras', null, 1, 20);

      expect(result.data.length).toBe(1);
      expect(result.nextCursor).toBeNull();
    });
  });
});
