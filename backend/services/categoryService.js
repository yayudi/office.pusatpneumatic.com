import db from "../config/db.js";
import * as categoryRepo from "../repositories/categoryRepository.js";
import { emitSharedTaskSignal } from "./firebaseSignalService.js";

/**
 * Mengambil semua kategori aktif
 * @returns {Promise<Array>}
 */
export const getAllCategories = async () => {
  const connection = await db.getConnection();
  try {
    return await categoryRepo.findAllCategories(connection);
  } finally {
    connection.release();
  }
};

/**
 * Membuat kategori baru
 * @param {string} name 
 * @returns {Promise<Object>}
 */
export const createCategory = async (name) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const trimmedName = name.trim();
    const id = await categoryRepo.createCategory(connection, trimmedName);
    await connection.commit();
    emitSharedTaskSignal('MASTER_DATA', 'REFRESH_CATEGORIES').catch(e => console.error(e));
    return { id, name: trimmedName };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const customError = new Error("Nama kategori sudah ada");
      customError.code = "DUPLICATE_ENTRY";
      throw customError;
    }
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Mengupdate kategori
 * @param {string} id 
 * @param {string} name 
 */
export const updateCategory = async (id, name) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const trimmedName = name.trim();
    const affected = await categoryRepo.updateCategory(connection, id, trimmedName);
    if (affected === 0) {
      const err = new Error("Kategori tidak ditemukan");
      err.code = "NOT_FOUND";
      throw err;
    }
    await connection.commit();
    emitSharedTaskSignal('MASTER_DATA', 'REFRESH_CATEGORIES').catch(e => console.error(e));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Menghapus kategori (soft delete)
 * @param {string} id 
 */
export const deleteCategory = async (id) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const affected = await categoryRepo.deleteCategory(connection, id);
    if (affected === 0) {
      const err = new Error("Kategori tidak ditemukan");
      err.code = "NOT_FOUND";
      throw err;
    }
    await connection.commit();
    emitSharedTaskSignal('MASTER_DATA', 'REFRESH_CATEGORIES').catch(e => console.error(e));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
