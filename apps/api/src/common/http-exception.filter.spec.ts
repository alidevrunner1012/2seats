import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const request = { url: '/ready' };
  const logger = {
    error: jest.fn<void, [Record<string, unknown>, string]>(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  const filter = new HttpExceptionFilter(logger as unknown as PinoLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    response.status.mockReturnThis();
  });

  it('sends a consistent JSON body for an HTTP exception', () => {
    filter.catch(
      new ServiceUnavailableException('Dependencies unavailable'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(response.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Dependencies unavailable',
        path: '/ready',
      }),
    );
    const logCall = logger.error.mock.calls[0];
    expect(logCall?.[0]).toMatchObject({ path: '/ready' });
    expect(logCall?.[0].err).toBeInstanceOf(ServiceUnavailableException);
    expect(logCall?.[1]).toBe('Unhandled request error');
  });

  it('logs unexpected errors and avoids exposing their details', () => {
    const error = new Error('database credentials leaked');

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      { err: error, path: '/ready' },
      'Unhandled request error',
    );
  });

  it('keeps validation messages as string arrays', () => {
    filter.catch(
      new HttpException(
        { message: ['name is required'] },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(response.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['name is required'],
      }),
    );
  });
});
