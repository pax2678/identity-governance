// T032: Connector Registry
// Central registry for managing connector instances
// Per research.md Decision #3: Plugin-based connector architecture

import type { IConnector } from './base/connector.interface'
import type { ConnectorFamily, ConnectorConfig } from './base/connector.types'
import { ConnectorState } from './base/connector.types'

/**
 * Connector factory function type
 * Creates a new connector instance
 */
export type ConnectorFactory = () => IConnector

/**
 * Registered connector information
 */
interface RegisteredConnector {
  family: ConnectorFamily
  factory: ConnectorFactory
  metadata: {
    name: string
    version: string
    supportedSystemTypes: string[]
  }
}

/**
 * Active connector instance
 */
interface ActiveConnectorInstance {
  systemId: string
  connector: IConnector
  state: ConnectorState
  config: ConnectorConfig
  lastHealthCheck?: Date
}

/**
 * Connector Registry
 * Manages connector registration and instantiation
 */
class ConnectorRegistry {
  private static instance: ConnectorRegistry
  private registeredConnectors: Map<ConnectorFamily, RegisteredConnector> = new Map()
  private activeConnectors: Map<string, ActiveConnectorInstance> = new Map()

  private constructor() {
    // Singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry()
    }
    return ConnectorRegistry.instance
  }

  /**
   * Register a connector factory
   * @param family - Connector family
   * @param factory - Factory function to create connector instances
   * @param metadata - Connector metadata
   */
  public register(
    family: ConnectorFamily,
    factory: ConnectorFactory,
    metadata: {
      name: string
      version: string
      supportedSystemTypes: string[]
    }
  ): void {
    if (this.registeredConnectors.has(family)) {
      throw new Error(`Connector family '${family}' is already registered`)
    }

    this.registeredConnectors.set(family, {
      family,
      factory,
      metadata,
    })
  }

  /**
   * Unregister a connector
   * @param family - Connector family to unregister
   */
  public unregister(family: ConnectorFamily): void {
    this.registeredConnectors.delete(family)
  }

  /**
   * Get all registered connector families
   */
  public getRegisteredFamilies(): ConnectorFamily[] {
    return Array.from(this.registeredConnectors.keys())
  }

  /**
   * Check if a connector family is registered
   */
  public isRegistered(family: ConnectorFamily): boolean {
    return this.registeredConnectors.has(family)
  }

  /**
   * Create and initialize a connector for a system
   * @param config - Connector configuration
   * @returns Initialized connector instance
   */
  public async createConnector(config: ConnectorConfig): Promise<IConnector> {
    const registered = this.registeredConnectors.get(config.connectorFamily)
    if (!registered) {
      throw new Error(`Connector family '${config.connectorFamily}' is not registered`)
    }

    // Create connector instance
    const connector = registered.factory()

    // Initialize connector
    await connector.initialize(config.connectionConfig)

    // Store active instance
    this.activeConnectors.set(config.systemId, {
      systemId: config.systemId,
      connector,
      state: ConnectorState.CONNECTED,
      config,
      lastHealthCheck: new Date(),
    })

    return connector
  }

  /**
   * Get active connector for a system
   * @param systemId - System ID
   * @returns Active connector instance or undefined
   */
  public getConnector(systemId: string): IConnector | undefined {
    const instance = this.activeConnectors.get(systemId)
    return instance?.connector
  }

  /**
   * Get connector state
   * @param systemId - System ID
   */
  public getConnectorState(systemId: string): ConnectorState | undefined {
    const instance = this.activeConnectors.get(systemId)
    return instance?.state
  }

  /**
   * Update connector state
   * @param systemId - System ID
   * @param state - New state
   */
  public updateConnectorState(systemId: string, state: ConnectorState): void {
    const instance = this.activeConnectors.get(systemId)
    if (instance) {
      instance.state = state
    }
  }

  /**
   * Disconnect and remove connector for a system
   * @param systemId - System ID
   */
  public async disconnectConnector(systemId: string): Promise<void> {
    const instance = this.activeConnectors.get(systemId)
    if (instance) {
      await instance.connector.disconnect()
      this.activeConnectors.delete(systemId)
    }
  }

  /**
   * Test connection for all active connectors
   * Returns map of systemId -> connection status
   */
  public async testAllConnections(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    for (const [systemId, instance] of this.activeConnectors) {
      try {
        const isConnected = await instance.connector.testConnection()
        results.set(systemId, isConnected)
        instance.lastHealthCheck = new Date()

        // Update state based on test result
        this.updateConnectorState(
          systemId,
          isConnected ? ConnectorState.CONNECTED : ConnectorState.DISCONNECTED
        )
      } catch (error) {
        results.set(systemId, false)
        this.updateConnectorState(systemId, ConnectorState.ERROR)
      }
    }

    return results
  }

  /**
   * Get all active connector system IDs
   */
  public getActiveConnectorSystems(): string[] {
    return Array.from(this.activeConnectors.keys())
  }

  /**
   * Get connector metadata by family
   */
  public getConnectorMetadata(family: ConnectorFamily): RegisteredConnector | undefined {
    return this.registeredConnectors.get(family)
  }

  /**
   * Clear all active connectors (cleanup)
   */
  public async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.activeConnectors.keys()).map((systemId) =>
      this.disconnectConnector(systemId)
    )
    await Promise.all(disconnectPromises)
  }
}

// Export singleton instance
export const connectorRegistry = ConnectorRegistry.getInstance()

// Export class for testing
export { ConnectorRegistry }
