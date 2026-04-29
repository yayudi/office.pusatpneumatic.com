// frontend/src/api/helpers/categories.js
import api from '../axios'

export const fetchCategories = async (search = '') => {
  try {
    const response = await api.get(`/categories?search=${search}`)
    return response.data.data
  } catch (error) {
    throw error
  }
}
