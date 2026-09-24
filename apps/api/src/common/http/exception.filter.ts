import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { ApiErrorBody } from "@repo/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../../generated/prisma/client.js";

const PRISMA_STATUS: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: "A record with these values already exists" },
  P2003: { status: HttpStatus.CONFLICT, message: "The operation violates a relation constraint" },
  P2025: { status: HttpStatus.NOT_FOUND, message: "The requested record was not found" },
};

/** Renders every error as an {@link ApiErrorBody}; never leaks internals. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const body = this.toBody(exception);
    body.requestId = request.id;

    if (body.statusCode >= 500) {
      this.logger.error({ err: exception, requestId: request.id }, "Unhandled error");
    }
    if (reply.sent) return;
    void reply.status(body.statusCode).send(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const payload =
        typeof response === "string" ? { message: response } : (response as Record<string, unknown>);
      const message = Array.isArray(payload.message)
        ? payload.message.join(", ")
        : String(payload.message ?? exception.message);
      return {
        statusCode: status,
        error: HttpStatus[status] ?? "Error",
        message,
        ...(payload.issues ? { issues: payload.issues as Record<string, string[]> } : {}),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_STATUS[exception.code];
      if (mapped) {
        return { statusCode: mapped.status, error: HttpStatus[mapped.status]!, message: mapped.message };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    };
  }
}
