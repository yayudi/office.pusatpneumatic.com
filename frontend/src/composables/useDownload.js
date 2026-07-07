import apiClient from "@/api/axios.js";

export function useDownload() {
  /**
   * Mengunduh blob (misal untuk data lokal, file hasil generate client-side)
   * @param {Blob} blob - Data Blob
   * @param {string} fileName - Nama file
   */
  const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  /**
   * Mengunduh file dari API
   * @param {string} url - Endpoint URL untuk file
   * @param {string} defaultFileName - Nama file default jika tidak diberikan oleh backend
   */
  const downloadFile = async (url, defaultFileName = "download") => {
    const response = await apiClient.get(url, { responseType: "blob" });
    downloadBlob(new Blob([response.data]), defaultFileName);
  };

  return {
    downloadBlob,
    downloadFile,
  };
}
