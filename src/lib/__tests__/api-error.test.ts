import { describe, it, expect } from 'vitest';
import { ApiError, ErrorCode } from '../api-error';

describe('api-error', () => {
  describe('ErrorCode constants', () => {
    it('should define all required error codes', () => {
      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.DUPLICATE_ERROR).toBe('DUPLICATE_ERROR');
      expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should have exactly 6 error codes', () => {
      const codes = Object.keys(ErrorCode);
      expect(codes).toHaveLength(6);
    });
  });

  describe('ApiError class', () => {
    it('should create an ApiError with all properties', () => {
      const error = new ApiError(
        404,
        'NOT_FOUND',
        'Resource not found',
        [{ id: 123 }]
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
      expect(error.details).toEqual([{ id: 123 }]);
      expect(error.name).toBe('ApiError');
    });

    it('should be an instance of Error', () => {
      const error = new ApiError(500, 'ERROR', 'Test error');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be an instance of ApiError', () => {
      const error = new ApiError(500, 'ERROR', 'Test error');
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should handle undefined details', () => {
      const error = new ApiError(400, 'BAD_REQUEST', 'Invalid request');
      expect(error.details).toBeUndefined();
    });
  });

  describe('ApiError.unauthorized', () => {
    it('should create 401 unauthorized error with default message', () => {
      const error = ApiError.unauthorized();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('認証が必要です');
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should create 401 unauthorized error with custom message', () => {
      const customMessage = 'Invalid token';
      const error = ApiError.unauthorized(customMessage);

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe(customMessage);
    });
  });

  describe('ApiError.forbidden', () => {
    it('should create 403 forbidden error with default message', () => {
      const error = ApiError.forbidden();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('アクセス権限がありません');
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should create 403 forbidden error with custom message', () => {
      const customMessage = 'Manager role required';
      const error = ApiError.forbidden(customMessage);

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe(customMessage);
    });
  });

  describe('ApiError.notFound', () => {
    it('should create 404 not found error with default message', () => {
      const error = ApiError.notFound();

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('リソースが見つかりません');
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should create 404 not found error with custom message', () => {
      const customMessage = 'User not found';
      const error = ApiError.notFound(customMessage);

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe(customMessage);
    });
  });

  describe('ApiError.validationError', () => {
    it('should create 422 validation error with message', () => {
      const error = ApiError.validationError('Invalid input');

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should create 422 validation error with details', () => {
      const details = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];
      const error = ApiError.validationError('Validation failed', details);

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(details);
      expect(error.details).toHaveLength(2);
    });

    it('should handle undefined details', () => {
      const error = ApiError.validationError('Invalid data');
      expect(error.details).toBeUndefined();
    });
  });

  describe('ApiError.duplicateError', () => {
    it('should create 422 duplicate error with default message', () => {
      const error = ApiError.duplicateError();

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('DUPLICATE_ERROR');
      expect(error.message).toBe('既に登録されています');
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should create 422 duplicate error with custom message', () => {
      const customMessage = 'Email already exists';
      const error = ApiError.duplicateError(customMessage);

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('DUPLICATE_ERROR');
      expect(error.message).toBe(customMessage);
    });
  });

  describe('ApiError.internalError', () => {
    it('should create 500 internal error with default message', () => {
      const error = ApiError.internalError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('サーバーエラーが発生しました');
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should create 500 internal error with custom message', () => {
      const customMessage = 'Database connection failed';
      const error = ApiError.internalError(customMessage);

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe(customMessage);
    });
  });

  describe('error handling scenarios', () => {
    it('should be catchable in try-catch block', () => {
      expect(() => {
        throw ApiError.notFound();
      }).toThrow(ApiError);
    });

    it('should preserve stack trace', () => {
      const error = ApiError.internalError();
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
    });

    it('should work with instanceof check', () => {
      const error = ApiError.unauthorized();
      const genericError = new Error('Generic error');

      expect(error instanceof ApiError).toBe(true);
      expect(error instanceof Error).toBe(true);
      expect(genericError instanceof ApiError).toBe(false);
    });

    it('should have correct error name', () => {
      const errors = [
        ApiError.unauthorized(),
        ApiError.forbidden(),
        ApiError.notFound(),
        ApiError.validationError('test'),
        ApiError.duplicateError(),
        ApiError.internalError(),
      ];

      errors.forEach((error) => {
        expect(error.name).toBe('ApiError');
      });
    });
  });
});
