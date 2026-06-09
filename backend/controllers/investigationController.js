import * as investigationService from "../services/investigationService.js";

/**
 * Mendapatkan transaksi ganda (duplikat).
 */
export const getDuplicateTransactions = async (req, res, next) => {
  try {
    const { startDate, endDate, includeNotes, excludeNotes, movementType, productName, username, location } = req.query;

    const duplicates = await investigationService.getDuplicateTransactionsService({
      startDate,
      endDate,
      includeNotes,
      excludeNotes,
      movementType,
      productName,
      username,
      location,
    });

    res.json({ success: true, data: duplicates });
  } catch (error) {
    next(error);
  }
};
