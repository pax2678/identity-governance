// T034: Error Handler Utility
// Centralized error handling and logging for IGA application

import { auditLogService } from '@/lib/services/audit/audit-log.service'
import { EventOutcome } from '@prisma/client'

/**
 * Custom error types for IGA
 */
export enum IGAErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  PROVISIONING_ERROR = 'PROVISIONING_ERROR',
  CONNECTOR_ERROR = 'CONNECTOR_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  POLICY_VIOLATION_ERROR = 'POLICY_VIOLATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom IGA Error class
 */
export class IGAError extends Error {
  public readonly type: IGAErrorType
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly isOperational: boolean

  constructor(
    type: IGAErrorType,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'IGAError'
    this.type = type
    this.statusCode = statusCode
    this.details = details
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error handler options
 */
interface ErrorHandlerOptions {
  logToAudit?: boolean
  actorIdentityId?: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

/**
 * Error Handler Service
 */
export class ErrorHandler {
  /**
   * Handle error and optionally log to audit
   * @param error - Error to handle
   * @param options - Handler options
   */
  static async handle(
    error: Error | IGAError,
    options: ErrorHandlerOptions = {}
  ): Promise<void> {
    const {
      logToAudit = true,
      actorIdentityId,
      resourceType,
      resourceId,
      metadata = {},
    } = options

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorHandler]', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof IGAError && {
          type: error.type,
          statusCode: error.statusCode,
          details: error.details,
        }),
      })
    }

    // Log to audit if enabled and required fields present
    if (logToAudit && resourceType && resourceId) {
      try {
        await auditLogService.logEvent({
          eventType: error instanceof IGAError ? error.type : 'UNKNOWN_ERROR',
          actorIdentityId,
          resourceType,
          resourceId,
          action: 'ERROR',
          outcome: EventOutcome.FAILURE,
          metadata: {
            errorMessage: error.message,
            errorStack: error.stack,
            ...(error instanceof IGAError && {
              errorType: error.type,
              errorDetails: error.details,
            }),
            ...metadata,
          },
        })
      } catch (auditError) {
        // Don't fail if audit logging fails
        console.error('[ErrorHandler] Failed to log to audit:', auditError)
      }
    }
  }

  /**
   * Convert error to API response format
   * @param error - Error to format
   * @returns Formatted error response
   */
  static toApiResponse(error: Error | IGAError): {
    error: string
    message: string
    statusCode: number
    details?: Record<string, unknown>
  } {
    if (error instanceof IGAError) {
      return {
        error: error.type,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      }
    }

    // Generic error response
    return {
      error: IGAErrorType.UNKNOWN_ERROR,
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
    }
  }

  /**
   * Check if error is operational (expected) or programming error
   * @param error - Error to check
   */
  static isOperational(error: Error | IGAError): boolean {
    if (error instanceof IGAError) {
      return error.isOperational
    }
    return false
  }
}

/**
 * Factory functions for common errors
 */
export const Errors = {
  validation: (message: string, details?: Record<string, unknown>) =>
    new IGAError(IGAErrorType.VALIDATION_ERROR, message, 400, details),

  authentication: (message: string = 'Authentication failed') =>
    new IGAError(IGAErrorType.AUTHENTICATION_ERROR, message, 401),

  authorization: (message: string = 'Insufficient permissions') =>
    new IGAError(IGAErrorType.AUTHORIZATION_ERROR, message, 403),

  notFound: (resource: string, id?: string) =>
    new IGAError(
      IGAErrorType.NOT_FOUND_ERROR,
      id ? `${resource} with ID '${id}' not found` : `${resource} not found`,
      404
    ),

  conflict: (message: string, details?: Record<string, unknown>) =>
    new IGAError(IGAErrorType.CONFLICT_ERROR, message, 409, details),

  provisioning: (message: string, details?: Record<string, unknown>) =>
    new IGAError(IGAErrorType.PROVISIONING_ERROR, message, 500, details),

  connector: (message: string, details?: Record<string, unknown>) =>
    new IGAError(IGAErrorType.CONNECTOR_ERROR, message, 500, details),

  database: (message: string, details?: Record<string, unknown>) =>
    new IGAError(IGAErrorType.DATABASE_ERROR, message, 500, details, false),

  policyViolation: (
    policyType: string,
    message: string,
    details?: Record<string, unknown>
  ) =>
    new IGAError(
      IGAErrorType.POLICY_VIOLATION_ERROR,
      `${policyType} policy violation: ${message}`,
      400,
      details
    ),

  unknown: (message: string = 'An unexpected error occurred') =>
    new IGAError(IGAErrorType.UNKNOWN_ERROR, message, 500, {}, false),
}

/**
 * Async error wrapper for route handlers
 * Automatically catches and handles errors
 */
export function asyncHandler(
  fn: Function,
  options?: ErrorHandlerOptions
): Function {
  return async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      await ErrorHandler.handle(error as Error, options)
      throw error
    }
  }
}
