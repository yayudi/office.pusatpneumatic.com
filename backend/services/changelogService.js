import * as changelogRepository from "../repositories/changelogRepository.js";

/**
 * Memanggil repository dan merapikan data changelog jika diperlukan.
 * @returns {Promise<Array>}
 */
export const fetchChangelogs = async () => {
  const logs = await changelogRepository.getChangelogs();
  
  // Transform format snake_case ke camelCase
  return logs.map(log => ({
    id: log.id,
    version: log.version,
    title: log.title,
    description: log.description,
    type: log.type,
    releaseDate: log.release_date,
    createdAt: log.created_at
  }));
};
