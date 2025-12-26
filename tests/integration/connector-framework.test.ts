// Integration tests for connector framework
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { connectorRegistry } from '@/lib/connectors/registry'
import type { IConnector } from '@/lib/connectors/base/connector.interface'
import type { ConnectorFamily } from '@/lib/connectors/base/connector.types'
import { ConnectorState } from '@/lib/connectors/base/connector.types'

// Mock LDAP connector for testing
class MockLdapConnector implements IConnector {
  metadata = {
    id: 'mock-ldap',
    name: 'Mock LDAP Connector',
    version: '1.0.0',
    family: 'ldap' as ConnectorFamily,
    supportedSystemTypes: ['Active Directory', 'OpenLDAP'],
    capabilities: {
      canDiscoverAccounts: true,
      canDiscoverEntitlements: true,
      canDiscoverGrants: true,
      canProvisionAccounts: true,
      canUpdateAccounts: true,
      canDeprovisionAccounts: true,
      canGrantEntitlements: true,
      canRevokeEntitlements: true,
      supportsRealTimeProvisioning: true,
      supportsTimeBoundGrants: false,
    },
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    // Mock initialization
  }

  async testConnection(): Promise<boolean> {
    return true
  }

  async disconnect(): Promise<void> {
    // Mock disconnect
  }

  async discoverAccounts() {
    return [
      {
        nativeId: 'cn=john,dc=example,dc=com',
        accountType: 'ldap_user',
        metadata: { dn: 'cn=john,dc=example,dc=com', cn: 'john' },
        status: 'active' as const,
      },
    ]
  }

  async discoverEntitlements() {
    return [
      {
        nativeId: 'cn=admins,dc=example,dc=com',
        entitlementType: 'group',
        displayName: 'Administrators',
        shape: { dn: 'cn=admins,dc=example,dc=com' },
        isPrivileged: true,
      },
    ]
  }

  async discoverGrants() {
    return [
      {
        accountNativeId: 'cn=john,dc=example,dc=com',
        entitlementNativeId: 'cn=admins,dc=example,dc=com',
        grantType: 'direct' as const,
      },
    ]
  }
}

describe('Connector Framework Integration Tests', () => {
  const testSystemId = '550e8400-e29b-41d4-a716-446655440000'

  beforeAll(() => {
    // Register mock connector
    connectorRegistry.register(
      'ldap',
      () => new MockLdapConnector(),
      {
        name: 'Mock LDAP Connector',
        version: '1.0.0',
        supportedSystemTypes: ['Active Directory', 'OpenLDAP'],
      }
    )
  })

  afterEach(async () => {
    // Cleanup: disconnect any active connectors
    try {
      await connectorRegistry.disconnectConnector(testSystemId)
    } catch (error) {
      // Ignore errors if connector wasn't connected
    }
  })

  describe('Connector Registration', () => {
    it('should register a connector family', () => {
      const isRegistered = connectorRegistry.isRegistered('ldap')

      expect(isRegistered).toBe(true)
    })

    it('should list registered connector families', () => {
      const families = connectorRegistry.getRegisteredFamilies()

      expect(families).toContain('ldap')
      expect(Array.isArray(families)).toBe(true)
    })

    it('should throw error when checking unregistered connector', () => {
      const isRegistered = connectorRegistry.isRegistered('nonexistent' as ConnectorFamily)

      expect(isRegistered).toBe(false)
    })
  })

  describe('Connector Lifecycle', () => {
    it('should create and initialize connector instance', async () => {
      const connector = await connectorRegistry.createConnector({
        systemId: testSystemId,
        connectorFamily: 'ldap',
        connectionConfig: {
          host: 'ldap.example.com',
          port: 389,
          bindDn: 'cn=admin,dc=example,dc=com',
          bindPassword: 'secret',
        },
      })

      expect(connector).toBeDefined()
      expect(connector.metadata.family).toBe('ldap')
    })

    it('should test connection successfully', async () => {
      const connector = await connectorRegistry.createConnector({
        systemId: testSystemId,
        connectorFamily: 'ldap',
        connectionConfig: {
          host: 'ldap.example.com',
          port: 389,
        },
      })

      const connectionOk = await connector.testConnection()

      expect(connectionOk).toBe(true)
    })

    it('should track connector state', async () => {
      await connectorRegistry.createConnector({
        systemId: testSystemId,
        connectorFamily: 'ldap',
        connectionConfig: { host: 'ldap.example.com' },
      })

      const state = connectorRegistry.getConnectorState(testSystemId)

      expect(state).toBe(ConnectorState.CONNECTED)
    })

    it('should disconnect connector', async () => {
      await connectorRegistry.createConnector({
        systemId: testSystemId,
        connectorFamily: 'ldap',
        connectionConfig: { host: 'ldap.example.com' },
      })

      await connectorRegistry.disconnectConnector(testSystemId)

      const state = connectorRegistry.getConnectorState(testSystemId)

      expect(state).toBeUndefined()
    })
  })

  describe('Discovery Operations', () => {
    let connector: IConnector

    beforeAll(async () => {
      connector = await connectorRegistry.createConnector({
        systemId: testSystemId,
        connectorFamily: 'ldap',
        connectionConfig: { host: 'ldap.example.com' },
      })
    })

    it('should discover accounts', async () => {
      const accounts = await connector.discoverAccounts()

      expect(accounts).toBeDefined()
      expect(Array.isArray(accounts)).toBe(true)
      expect(accounts.length).toBeGreaterThan(0)
      expect(accounts[0]).toHaveProperty('nativeId')
      expect(accounts[0]).toHaveProperty('accountType')
      expect(accounts[0].nativeId).toBe('cn=john,dc=example,dc=com')
    })

    it('should discover entitlements', async () => {
      const entitlements = await connector.discoverEntitlements()

      expect(entitlements).toBeDefined()
      expect(Array.isArray(entitlements)).toBe(true)
      expect(entitlements.length).toBeGreaterThan(0)
      expect(entitlements[0]).toHaveProperty('nativeId')
      expect(entitlements[0]).toHaveProperty('entitlementType')
      expect(entitlements[0]).toHaveProperty('displayName')
      expect(entitlements[0].displayName).toBe('Administrators')
    })

    it('should discover grants', async () => {
      const grants = await connector.discoverGrants()

      expect(grants).toBeDefined()
      expect(Array.isArray(grants)).toBe(true)
      expect(grants.length).toBeGreaterThan(0)
      expect(grants[0]).toHaveProperty('accountNativeId')
      expect(grants[0]).toHaveProperty('entitlementNativeId')
      expect(grants[0]).toHaveProperty('grantType')
    })
  })

  describe('Connector Capabilities', () => {
    it('should expose connector capabilities', async () => {
      const connector = await connectorRegistry.createConnector({
        systemId: testSystemId,
        connectorFamily: 'ldap',
        connectionConfig: { host: 'ldap.example.com' },
      })

      const { capabilities } = connector.metadata

      expect(capabilities.canDiscoverAccounts).toBe(true)
      expect(capabilities.canDiscoverEntitlements).toBe(true)
      expect(capabilities.canDiscoverGrants).toBe(true)
      expect(capabilities.canProvisionAccounts).toBe(true)
      expect(capabilities.supportsRealTimeProvisioning).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should throw error when creating connector for unregistered family', async () => {
      await expect(
        connectorRegistry.createConnector({
          systemId: '550e8400-e29b-41d4-a716-446655440001',
          connectorFamily: 'nonexistent' as ConnectorFamily,
          connectionConfig: {},
        })
      ).rejects.toThrow('not registered')
    })

    it('should not throw error when disconnecting non-existent connector', async () => {
      const fakeSystemId = '550e8400-e29b-41d4-a716-446655440099'

      // Should silently succeed (graceful handling)
      await expect(
        connectorRegistry.disconnectConnector(fakeSystemId)
      ).resolves.not.toThrow()
    })
  })
})
