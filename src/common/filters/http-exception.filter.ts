import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

/**
 * Paths hit by the Inngest Dev Server during auto-discovery.
 * The backend does NOT host Inngest (it lives in the agent micro at :4000).
 * We return 404 silently instead of logging ERROR noise on every scan.
 */
const INNGEST_DISCOVERY_PATHS = [
  '/api/inngest',
  '/x/inngest',
  '/.netlify/functions/inngest',
  '/.redwood/functions/inngest',
  '/inngest',
];

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Silently drop Inngest Dev Server discovery probes
    const isInngestDiscovery =
      status === HttpStatus.NOT_FOUND &&
      INNGEST_DISCOVERY_PATHS.some((p) => request.url.startsWith(p));

    if (isInngestDiscovery) {
      response.status(HttpStatus.NOT_FOUND).json({
        statusCode: 404,
        message: 'Not Found',
      });
      return;
    }

    let message: string | string[];

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (responseObj.message as string | string[]) || 'An error occurred';
      } else {
        message = 'An error occurred';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    } else {
      message = 'Internal server error';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json(errorResponse);
  }
}
