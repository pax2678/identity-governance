// T030: Base Connector Interface
// Defines the contract all connectors must implement
// Per research.md Decision #3: Plugin-based connector architecture

import type { Account, Entitlement, AccountEntitlementGrant } from '@prisma/client'
import type { ConnectorCapability, ConnectorMetadata, ProvisioningResult } from './connector.types'

/**
 * Base interface that all IGA connectors must implement
 * Supports both read (discovery) and write (provisioning) operations
 */
export interface IConnector {
  /**
   * Connector metadata and capabilities
   */
  readonly metadata: ConnectorMetadata

  /**
   * Initialize connector with system-specific configuration
   * @param config - Connection configuration (host, credentials, etc.)
   */
  initialize(config: Record<string, unknown>): Promise<void>

  /**
   * Test connectivity to target system
   * @returns true if connection successful, false otherwise
   */
  testConnection(): Promise<boolean>

  /**
   * Disconnect and cleanup resources
   */
  disconnect(): Promise<void>

  /**
   * Discover all accounts from target system (FR-007: Discovery)
   * @returns Array of discovered accounts
   */
  discoverAccounts(): Promise<DiscoveredAccount[]>

  /**
   * Discover all entitlements from target system (FR-007: Discovery)
   * @returns Array of discovered entitlements
   */
  discoverEntitlements(): Promise<DiscoveredEntitlement[]>

  /**
   * Discover grants (account-entitlement relationships) from target system
   * @returns Array of discovered grants
   */
  discoverGrants(): Promise<DiscoveredGrant[]>

  /**
   * Provision a new account in target system (FR-020: Provisioning)
   * @param account - Account data to provision
   * @returns Provisioning result with native ID
   */
  provisionAccount?(account: AccountProvisionRequest): Promise<ProvisioningResult>

  /**
   * Update existing account in target system
   * @param account - Updated account data
   * @returns Provisioning result
   */
  updateAccount?(account: AccountUpdateRequest): Promise<ProvisioningResult>

  /**
   * Deprovision (delete/disable) account in target system (FR-023: Deprovisioning)
   * @param nativeId - Native account ID in target system
   * @param action - 'disable' or 'delete'
   * @returns Provisioning result
   */
  deprovisionAccount?(nativeId: string, action: 'disable' | 'delete'): Promise<ProvisioningResult>

  /**
   * Grant entitlement to account in target system (FR-020: Provisioning)
   * @param grant - Grant data (accountId, entitlementId)
   * @returns Provisioning result
   */
  grantEntitlement?(grant: EntitlementGrantRequest): Promise<ProvisioningResult>

  /**
   * Revoke entitlement from account in target system (FR-024: Revocation)
   * @param grant - Grant data to revoke
   * @returns Provisioning result
   */
  revokeEntitlement?(grant: EntitlementRevokeRequest): Promise<ProvisioningResult>
}

/**
 * Discovered account from target system
 */
export interface DiscoveredAccount {
  nativeId: string
  accountType: string
  metadata: Record<string, unknown>
  status: 'active' | 'disabled' | 'deleted'
}

/**
 * Discovered entitlement from target system
 */
export interface DiscoveredEntitlement {
  nativeId: string
  entitlementType: string
  displayName: string
  shape: Record<string, unknown>
  isPrivileged?: boolean
}

/**
 * Discovered grant (account-entitlement relationship)
 */
export interface DiscoveredGrant {
  accountNativeId: string
  entitlementNativeId: string
  grantType: 'direct' | 'inherited'
}

/**
 * Request to provision new account
 */
export interface AccountProvisionRequest {
  accountType: string
  attributes: Record<string, unknown>
  credentialRef?: string
}

/**
 * Request to update existing account
 */
export interface AccountUpdateRequest {
  nativeId: string
  attributes: Record<string, unknown>
  status?: 'active' | 'disabled'
}

/**
 * Request to grant entitlement to account
 */
export interface EntitlementGrantRequest {
  accountNativeId: string
  entitlementNativeId: string
  timebound?: {
    startTime: Date
    endTime: Date
  }
}

/**
 * Request to revoke entitlement from account
 */
export interface EntitlementRevokeRequest {
  accountNativeId: string
  entitlementNativeId: string
}
