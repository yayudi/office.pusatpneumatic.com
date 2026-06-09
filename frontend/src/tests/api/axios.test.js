import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'
import axios from '@/api/axios'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock window.location
const originalWindowLocation = window.location
beforeAll(() => {
  delete window.location
  window.location = { href: '' }
})
afterAll(() => {
  window.location = originalWindowLocation
})

describe('Axios Interceptors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    window.location.href = ''
  })

  it('Should add Authorization header if token exists in store', async () => {
    const authStore = useAuthStore()
    authStore.token = 'dummy-token'

    const config = { headers: {} }
    // Memanggil interceptor request secara langsung
    const newConfig = await axios.interceptors.request.handlers[0].fulfilled(config)

    expect(newConfig.headers['Authorization']).toBe('Bearer dummy-token')
  })

  it('Should increase timeout for FormData', async () => {
    const config = { data: new FormData(), headers: {} }
    const newConfig = await axios.interceptors.request.handlers[0].fulfilled(config)

    expect(newConfig.timeout).toBe(80000)
  })

  it('Should handle 401 Unauthorized by logging out and redirecting', async () => {
    const authStore = useAuthStore()
    const logoutSpy = vi.spyOn(authStore, 'logout').mockImplementation(() => {})

    const error = {
      response: { status: 401, data: {} },
      config: { url: '/api/some-endpoint' }
    }

    try {
      await axios.interceptors.response.handlers[0].rejected(error)
    } catch (e) {
      expect(e).toBe(error)
    }

    expect(logoutSpy).toHaveBeenCalled()
    expect(window.location.href).toBe('/login')
  })

  it('Should format Zod validation errors on 400', async () => {
    const error = {
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: 'body.email is required'
        }
      },
      config: { url: '/api/data' }
    }

    try {
      await axios.interceptors.response.handlers[0].rejected(error)
    } catch (e) {
      expect(e.response.data.message).toBe('email is required')
    }
  })
})
