import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { handleError, withErrorHandler } from '../error-handler';
import { ApiError } from '@/lib/api-error';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';

describe('error-handler', () => {
  describe('handleError', () => {
    it('should handle ApiError and return correct response', async () => {
      const error = ApiError.notFound('User not found');
      const response = handleError(error);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    it('should handle ApiError with details', async () => {
      const details = [{ field: 'email', message: 'Invalid format' }];
      const error = ApiError.validationError('Validation failed', details);
      const response = handleError(error);

      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.error.details).toEqual(details);
    });

    it('should handle ZodError and return validation error response', async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0),
      });

      try {
        schema.parse({ email: 'invalid-email', age: -1 });
      } catch (error) {
        const response = handleError(error);

        expect(response.status).toBe(422);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toBe('入力値が不正です');
        expect(body.error.details).toBeDefined();
        expect(Array.isArray(body.error.details)).toBe(true);
      }
    });

    it('should handle Prisma unique constraint error (P2002)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        }
      );

      const response = handleError(prismaError);

      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.error.code).toBe('DUPLICATE_ERROR');
      expect(body.error.message).toBe('既に登録されています');
    });

    it('should handle Prisma not found error (P2025)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        }
      );

      const response = handleError(prismaError);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('リソースが見つかりません');
    });

    it('should handle unknown errors as internal server error', async () => {
      const error = new Error('Unknown error');
      const response = handleError(error);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('サーバーエラーが発生しました');
    });

    it('should handle various ApiError types correctly', async () => {
      const testCases = [
        { error: ApiError.unauthorized(), expectedStatus: 401 },
        { error: ApiError.forbidden(), expectedStatus: 403 },
        { error: ApiError.notFound(), expectedStatus: 404 },
        { error: ApiError.validationError('test'), expectedStatus: 422 },
        { error: ApiError.duplicateError(), expectedStatus: 422 },
        { error: ApiError.internalError(), expectedStatus: 500 },
      ];

      for (const { error, expectedStatus } of testCases) {
        const response = handleError(error);
        expect(response.status).toBe(expectedStatus);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe(error.code);
      }
    });
  });

  describe('withErrorHandler', () => {
    it('should return response from handler when no error occurs', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true, data: { id: 1 } })
      );

      const wrappedHandler = withErrorHandler(mockHandler);
      const response = await wrappedHandler();

      expect(mockHandler).toHaveBeenCalled();
      expect(response).toBeInstanceOf(NextResponse);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: 1 });
    });

    it('should catch and handle errors thrown by handler', async () => {
      const mockHandler = vi.fn().mockRejectedValue(
        ApiError.notFound('Resource not found')
      );

      const wrappedHandler = withErrorHandler(mockHandler);
      const response = await wrappedHandler();

      expect(mockHandler).toHaveBeenCalled();
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should pass arguments to the wrapped handler', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const mockParams = { id: '123' };

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withErrorHandler(mockHandler);
      await wrappedHandler(mockRequest, { params: mockParams });

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, { params: mockParams });
    });

    it('should handle errors from async operations', async () => {
      const mockHandler = async () => {
        await Promise.resolve();
        throw ApiError.internalError('Database error');
      };

      const wrappedHandler = withErrorHandler(mockHandler);
      const response = await wrappedHandler();

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('Database error');
    });

    it('should work with different handler signatures', async () => {
      // GET handler
      const getHandler = withErrorHandler(async (request: NextRequest) => {
        return NextResponse.json({ method: 'GET' });
      });

      // POST handler with params
      const postHandler = withErrorHandler(
        async (
          request: NextRequest,
          context: { params: { id: string } }
        ) => {
          return NextResponse.json({ method: 'POST', id: context.params.id });
        }
      );

      const mockRequest = new NextRequest('http://localhost:3000/api/test');

      const getResponse = await getHandler(mockRequest);
      const getBody = await getResponse.json();
      expect(getBody.method).toBe('GET');

      const postResponse = await postHandler(mockRequest, {
        params: { id: '1' },
      });
      const postBody = await postResponse.json();
      expect(postBody.method).toBe('POST');
      expect(postBody.id).toBe('1');
    });
  });
});
