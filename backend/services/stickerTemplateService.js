import * as repo from "../repositories/stickerTemplateRepository.js";

/**
 * Mendapatkan semua template
 * @returns {Promise<Array>}
 */
export const fetchAllTemplates = async () => {
  const templates = await repo.getAllTemplates();
  // Parse config_json string back to object
  return templates.map(t => ({
    ...t,
    config_json: t.config_json ? JSON.parse(t.config_json) : null
  }));
};

/**
 * Menyimpan template baru
 * @param {Object} data
 * @param {string} data.name
 * @param {string} data.paper_size
 * @param {Object|string} data.config_json
 * @returns {Promise<number>}
 */
export const createTemplate = async (data) => {
  if (!data.name) throw new Error("Nama template wajib diisi");
  
  const payload = {
    name: data.name,
    paper_size: data.paper_size || "80x40",
    config_json: typeof data.config_json === 'string' ? data.config_json : JSON.stringify(data.config_json)
  };

  return await repo.createTemplate(payload);
};

/**
 * Menghapus template
 * @param {number} id 
 * @returns {Promise<boolean>}
 */
export const removeTemplate = async (id) => {
  if (!id) throw new Error("ID tidak valid");
  return await repo.deleteTemplate(id);
};
