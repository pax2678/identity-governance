// T031: Connector Type Definitions
// Type definitions for connector framework
// Based on research.md coverage-matrix.yaml connector families

/**
 * Connector capability flags
 * Indicates which operations a connector supports
 */
export interface ConnectorCapability {
  /** Can discover accounts from target system */
  canDiscoverAccounts: boolean
  /** Can discover entitlements from target system */
  canDiscoverEntitlements: boolean
  /** Can discover grants from target system */
  canDiscoverGrants: boolean
  /** Can provision new accounts */
  canProvisionAccounts: boolean
  /** Can update existing accounts */
  canUpdateAccounts: boolean
  /** Can deprovision (disable/delete) accounts */
  canDeprovisionAccounts: boolean
  /** Can grant entitlements to accounts */
  canGrantEntitlements: boolean
  /** Can revoke entitlements from accounts */
  canRevokeEntitlements: boolean
  /** Supports real-time provisioning (vs batch/async) */
  supportsRealTimeProvisioning: boolean
  /** Supports time-bound grants (TTL) */
  supportsTimeBoundGrants: boolean
}

/**
 * Connector metadata
 */
export interface ConnectorMetadata {
  /** Unique connector ID (e.g., "ldap-connector", "scim-connector") */
  id: string
  /** Display name */
  name: string
  /** Connector version */
  version: string
  /** Connector family from coverage-matrix.yaml */
  family: ConnectorFamily
  /** System types supported (e.g., ["Active Directory", "OpenLDAP"]) */
  supportedSystemTypes: string[]
  /** Connector capabilities */
  capabilities: ConnectorCapability
  /** Configuration schema (JSON Schema) */
  configSchema?: Record<string, unknown>
}

/**
 * Connector families from coverage-matrix.yaml
 */
export type ConnectorFamily =
  | 'ldap'           // LDAP/Active Directory
  | 'scim'           // SCIM 2.0 (Okta, Azure AD, etc.)
  | 'k8s_api'        // Kubernetes API
  | 'aws_api'        // AWS IAM API
  | 'azure_api'      // Azure AD Graph API
  | 'gcp_api'        // GCP IAM API
  | 'database'       // PostgreSQL, MySQL, etc.
  | 'rest_api'       // Generic REST API
  | 'saas_native'    // SaaS-native connectors (Salesforce, ServiceNow, etc.)

/**
 * Provisioning operation result
 */
export interface ProvisioningResult {
  /** Operation success status */
  success: boolean
  /** Native ID in target system (for new resources) */
  nativeId?: string
  /** Error message if operation failed */
  error?: string
  /** Error code for specific failure types */
  errorCode?: ProvisioningErrorCode
  /** Additional metadata from target system */
  metadata?: Record<string, unknown>
  /** Timestamp of operation */
  timestamp: Date
}

/**
 * Provisioning error codes
 */
export enum ProvisioningErrorCode {
  /** Connection to target system failed */
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  /** Authentication/authorization failed */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** Resource already exists */
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  /** Resource not found */
  NOT_FOUND = 'NOT_FOUND',
  /** Invalid input parameters */
  INVALID_INPUT = 'INVALID_INPUT',
  /** Operation timeout */
  TIMEOUT = 'TIMEOUT',
  /** Target system rejected operation */
  REJECTED = 'REJECTED',
  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Connector state
 */
export enum ConnectorState {
  /** Not initialized */
  UNINITIALIZED = 'UNINITIALIZED',
  /** Connected and ready */
  CONNECTED = 'CONNECTED',
  /** Connection failed or lost */
  DISCONNECTED = 'DISCONNECTED',
  /** Error state */
  ERROR = 'ERROR',
}

/**
 * Connector configuration
 */
export interface ConnectorConfig {
  /** System ID this connector is associated with */
  systemId: string
  /** Connector family to use */
  connectorFamily: ConnectorFamily
  /** Connection configuration (host, port, credentials, etc.) */
  connectionConfig: Record<string, unknown>
  /** Connector-specific options */
  options?: {
    /** Discovery batch size */
    discoveryBatchSize?: number
    /** Provisioning timeout in ms */
    provisioningTimeout?: number
    /** Enable dry-run mode (no actual changes) */
    dryRun?: boolean
    /** Enable verbose logging */
    verbose?: boolean
  }
}

/**
 * Discovery run metadata
 */
export interface DiscoveryRunMetadata {
  /** System ID being discovered */
  systemId: string
  /** Discovery run ID */
  runId: string
  /** Start timestamp */
  startedAt: Date
  /** End timestamp */
  completedAt?: Date
  /** Discovery status */
  status: 'running' | 'completed' | 'failed'
  /** Statistics */
  stats: {
    accountsDiscovered: number
    entitlementsDiscovered: number
    grantsDiscovered: number
    errors: number
  }
  /** Error details if failed */
  error?: string
}
