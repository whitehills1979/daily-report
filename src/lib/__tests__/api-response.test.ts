import { describe, it, expect } from 'vitest';
import {
  successResponse,
  errorResponse,
  type ApiSuccessResponse,
  type ApiErrorResponse,
} from '../api-response';

describe('api-response', () => {
  describe('successResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: 1, name: 'Test User' };
      const response = successResponse(data);

      expect(response).toEqual({
        success: true,
        data: { id: 1, name: 'Test User' },
      });
    });

    it('should have success property set to true', () => {
      const response = successResponse({ test: 'data' });
      expect(response.success).toBe(true);
    });

    it('should preserve data type and structure', () => {
      const complexData = {
        user: { id: 1, name: 'John' },
        posts: [
          { id: 1, title: 'Post 1' },
          { id: 2, title: 'Post 2' },
        ],
        meta: { total: 2 },
      };

      const response = successResponse(complexData);
      expect(response.data).toEqual(complexData);
      expect(response.data.user.id).toBe(1);
      expect(response.data.posts).toHaveLength(2);
    });

    it('should handle null as valid data', () => {
      const response = successResponse(null);
      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });

    it('should handle empty object as data', () => {
      const response = successResponse({});
      expect(response.success).toBe(true);
      expect(response.data).toEqual({});
    });

    it('should handle array as data', () => {
      const data = [1, 2, 3, 4, 5];
      const response = successResponse(data);
      expect(response.success).toBe(true);
      expect(response.data).toEqual([1, 2, 3, 4, 5]);
    });

    it('should satisfy ApiSuccessResponse type', () => {
      const response: ApiSuccessResponse<{ id: number }> = successResponse({
        id: 1,
      });
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
    });
  });

  describe('errorResponse', () => {
    it('should create an error response with code and message', () => {
      const response = errorResponse('NOT_FOUND', 'User not found');

      expect(response).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    it('should have success property set to false', () => {
      const response = errorResponse('ERROR_CODE', 'Error message');
      expect(response.success).toBe(false);
    });

    it('should include details when provided', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];

      const response = errorResponse('VALIDATION_ERROR', 'Validation failed', details);

      expect(response.error.details).toEqual(details);
      expect(response.error.details).toHaveLength(2);
    });

    it('should not include details field when details is undefined', () => {
      const response = errorResponse('ERROR_CODE', 'Error message');
      expect(response.error).not.toHaveProperty('details');
    });

    it('should not include details field when details is empty array', () => {
      const response = errorResponse('ERROR_CODE', 'Error message', []);
      expect(response.error).not.toHaveProperty('details');
    });

    it('should preserve error code and message exactly', () => {
      const code = 'CUSTOM_ERROR_CODE';
      const message = 'This is a custom error message';

      const response = errorResponse(code, message);

      expect(response.error.code).toBe(code);
      expect(response.error.message).toBe(message);
    });

    it('should handle various error codes', () => {
      const codes = [
        'UNAUTHORIZED',
        'FORBIDDEN',
        'NOT_FOUND',
        'VALIDATION_ERROR',
        'DUPLICATE_ERROR',
        'INTERNAL_ERROR',
      ];

      codes.forEach((code) => {
        const response = errorResponse(code, 'Test message');
        expect(response.error.code).toBe(code);
      });
    });

    it('should satisfy ApiErrorResponse type', () => {
      const response: ApiErrorResponse = errorResponse(
        'NOT_FOUND',
        'Resource not found'
      );
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });
  });

  describe('response type guards', () => {
    it('should differentiate between success and error responses', () => {
      const success = successResponse({ id: 1 });
      const error = errorResponse('ERROR', 'Failed');

      if (success.success) {
        // TypeScriptの型ガードが機能することを確認
        expect(success.data).toBeDefined();
      }

      if (!error.success) {
        // TypeScriptの型ガードが機能することを確認
        expect(error.error).toBeDefined();
      }
    });
  });
});
