import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  get,
  post,
  put,
  del,
  getToken,
  setToken,
  removeToken,
  ApiClientError,
} from '../api-client'

// グローバルfetchのモック
const mockFetch = vi.fn()
global.fetch = mockFetch

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// window.location.hrefのモック
const locationMock = {
  href: '',
  pathname: '/dashboard',
}

// teardownを防ぐため、deleteを使わずに直接上書き
;(window as any).location = locationMock

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorageMock.clear()
    locationMock.href = ''
    locationMock.pathname = '/dashboard'
  })

  describe('Token Management', () => {
    it('should save token to localStorage', () => {
      const token = 'test-token-123'
      setToken(token)
      expect(localStorage.getItem('auth_token')).toBe(token)
    })

    it('should retrieve token from localStorage', () => {
      const token = 'test-token-456'
      localStorage.setItem('auth_token', token)
      expect(getToken()).toBe(token)
    })

    it('should remove token from localStorage', () => {
      const token = 'test-token-789'
      localStorage.setItem('auth_token', token)
      removeToken()
      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('should return null when no token exists', () => {
      expect(getToken()).toBeNull()
    })
  })

  describe('GET Request', () => {
    it('should make GET request with correct headers', async () => {
      const mockData = { id: 1, name: 'Test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockData }),
      })

      const result = await get('/api/test')

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual(mockData)
    })

    it('should include Authorization header when token exists', async () => {
      const token = 'test-token'
      setToken(token)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      })

      await get('/api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      )
    })

    it('should not include Authorization header when auth is false', async () => {
      const token = 'test-token'
      setToken(token)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      })

      await get('/api/test', { auth: false })

      const callArgs = mockFetch.mock.calls[0][1]
      expect(callArgs.headers).not.toHaveProperty('Authorization')
    })
  })

  describe('POST Request', () => {
    it('should make POST request with body', async () => {
      const requestBody = { name: 'Test User', email: 'test@example.com' }
      const responseData = { id: 1, ...requestBody }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: responseData }),
      })

      const result = await post('/api/users', requestBody)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual(responseData)
    })

    it('should make POST request without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      })

      await post('/api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      )
    })
  })

  describe('PUT Request', () => {
    it('should make PUT request with body', async () => {
      const requestBody = { name: 'Updated Name' }
      const responseData = { id: 1, ...requestBody }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: responseData }),
      })

      const result = await put('/api/users/1', requestBody)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      )
      expect(result).toEqual(responseData)
    })
  })

  describe('DELETE Request', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { message: 'Deleted' } }),
      })

      const result = await del('/api/users/1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(result).toEqual({ message: 'Deleted' })
    })
  })

  describe('Error Handling', () => {
    it('should throw ApiClientError on API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: [{ field: 'email', message: 'Invalid email' }],
          },
        }),
      })

      try {
        await get('/api/test')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).message).toBe('Invalid input')
      }
    })

    it('should include error details in ApiClientError', async () => {
      const errorDetails = [{ field: 'email', message: 'Invalid email' }]
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errorDetails,
          },
        }),
      })

      try {
        await get('/api/test')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).status).toBe(400)
        expect((error as ApiClientError).code).toBe('VALIDATION_ERROR')
        expect((error as ApiClientError).details).toEqual(errorDetails)
      }
    })

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      try {
        await get('/api/test')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).message).toBe('Invalid JSON response')
      }
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await get('/api/test')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).message).toBe('Network error')
      }
    })
  })

  describe('401 Error Handling', () => {
    it('should redirect to login on 401 error', async () => {
      const token = 'expired-token'
      setToken(token)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        }),
      })

      try {
        await get('/api/test')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
      }

      // トークンが削除されることを確認
      expect(getToken()).toBeNull()

      // リダイレクトされることを確認
      expect(locationMock.href).toBe('/login')
    })

    it('should save current path before redirecting to login', async () => {
      locationMock.pathname = '/dashboard'

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        }),
      })

      try {
        await get('/api/test')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
      }

      expect(localStorage.getItem('redirect_after_login')).toBe('/dashboard')
    })

    it('should not redirect when redirect option is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        }),
      })

      try {
        await get('/api/test', { redirect: false })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
      }

      // リダイレクトされないことを確認
      expect(locationMock.href).toBe('')
    })
  })

  describe('Custom Headers', () => {
    it('should merge custom headers with default headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      })

      await get('/api/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          }),
        })
      )
    })
  })
})
