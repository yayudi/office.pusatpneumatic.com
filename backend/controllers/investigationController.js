import * as investigationService from "../services/investigationService.js";

/**
 * Mendapatkan transaksi ganda (duplikat).
 */
export const getDuplicateTransactions = async (req, res, next) => {
  try {
    const { 
      startDate, endDate, includeNotes, excludeNotes, movementType, 
      productName, username, location, exactQuantity, page = 1, limit = 10,
      revertStatus, plSource, plStatus, plMarketplaceStatus, plCustomer,
      minOccurrences, maxOccurrences, minSku, maxSku, sortBy, sortDirection, maxTimeGap
    } = req.query;

    const parseTriState = (val) => {
      if (!val) return null;
      try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return val; }
    };

    const result = await investigationService.getDuplicateTransactionsService({
      startDate,
      endDate,
      includeNotes,
      excludeNotes,
      movementType: parseTriState(movementType),
      productName,
      username,
      location,
      exactQuantity: exactQuantity === 'true',
      revertStatus,
      plSource: parseTriState(plSource),
      plStatus: parseTriState(plStatus),
      plMarketplaceStatus,
      plCustomer,
      minOccurrences: minOccurrences ? Number(minOccurrences) : undefined,
      maxOccurrences: maxOccurrences ? Number(maxOccurrences) : undefined,
      minSku: minSku ? Number(minSku) : undefined,
      maxSku: maxSku ? Number(maxSku) : undefined,
      maxTimeGap: maxTimeGap ? Number(maxTimeGap) : undefined,
      sortBy,
      sortDirection
    }, Number(page), Number(limit));

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * Revert (Rollback) a specific transaction.
 */
export const revertTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1; // Assuming req.user is set by auth middleware

    const result = await investigationService.revertTransactionService(id, userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};
