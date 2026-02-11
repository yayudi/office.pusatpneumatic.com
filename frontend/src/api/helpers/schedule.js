import axios from '@/api/axios'

const ENDPOINT = '/schedules'

export const fetchSchedules = async (userId, startDate, endDate) => {
  const { data } = await axios.get(ENDPOINT, {
    params: { userId, startDate, endDate }
  })
  return data.data || []
}

export const createSchedule = async (payload) => {
  const { data } = await axios.post(ENDPOINT, payload)
  return data
}

export const deleteSchedule = async (userId, date) => {
  const response = await axios.delete('/schedules', { params: { userId, date } })
  return response.data
}

export const uploadScheduleImport = async (formData) => {
  const response = await axios.post('/schedules/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}
