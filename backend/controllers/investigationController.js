import * as investigationService from "../services/investigationService.js";

/**
 * Mendapatkan transaksi ganda (duplikat).
 */
export const getDuplicateTransactions = async (req, res, next) => {
  try {
    const { startDate, endDate, includeNotes, excludeNotes, movementType, productName, username, location, exactQuantity, page = 1, limit = 10 } = req.query;

    const result = await investigationService.getDuplicateTransactionsService({
      startDate,
      endDate,
      includeNotes,
      excludeNotes,
      movementType,
      productName,
      username,
      location,
      exactQuantity: exactQuantity === 'true',
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
