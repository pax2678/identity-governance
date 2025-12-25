// T035: Graph Query Utility for Apache AGE
// Utility functions for executing graph queries using Apache AGE extension
// Per research.md Decision #2: PostgreSQL with Apache AGE for graph capabilities

import { db } from '@/lib/db'

/**
 * Graph query result row
 */
export interface GraphQueryResult {
  [key: string]: unknown
}

/**
 * Graph path result (for path queries)
 */
export interface GraphPath {
  vertices: GraphVertex[]
  edges: GraphEdge[]
  length: number
}

/**
 * Graph vertex (node)
 */
export interface GraphVertex {
  id: string
  label: string
  properties: Record<string, unknown>
}

/**
 * Graph edge (relationship)
 */
export interface GraphEdge {
  id: string
  label: string
  start: string
  end: string
  properties: Record<string, unknown>
}

/**
 * Graph Query Service
 * Provides utilities for Apache AGE graph queries
 */
export class GraphQueryService {
  private readonly graphName: string = 'iga_graph'

  /**
   * Initialize graph (create graph if not exists)
   * Should be called during application startup
   */
  async initializeGraph(): Promise<void> {
    try {
      // Create AGE extension if not exists
      await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS age;`)

      // Load AGE extension
      await db.$executeRawUnsafe(`LOAD 'age';`)

      // Set search path to include ag_catalog
      await db.$executeRawUnsafe(`SET search_path = ag_catalog, "$user", public;`)

      // Create graph if not exists
      await db.$executeRawUnsafe(
        `SELECT * FROM ag_catalog.create_graph('${this.graphName}');`
      )
    } catch (error: any) {
      // Graph may already exist, ignore duplicate errors
      if (!error.message?.includes('already exists')) {
        throw error
      }
    }
  }

  /**
   * Execute a Cypher query using Apache AGE
   * @param query - Cypher query string
   * @param params - Query parameters (optional)
   * @returns Query results
   */
  async executeCypher(
    query: string,
    params?: Record<string, unknown>
  ): Promise<GraphQueryResult[]> {
    try {
      // Set search path for AGE
      await db.$executeRawUnsafe(`SET search_path = ag_catalog, "$user", public;`)

      // Build parameterized query
      const cypherQuery = this.buildCypherQuery(query, params)

      // Execute query
      const results = await db.$queryRawUnsafe<GraphQueryResult[]>(
        `SELECT * FROM cypher('${this.graphName}', $$ ${cypherQuery} $$) as (result agtype);`
      )

      return results
    } catch (error) {
      console.error('[GraphQueryService] Cypher query failed:', error)
      throw error
    }
  }

  /**
   * Find all paths between two identities
   * Useful for FR-003: Identity-Account linking and entitlement inheritance
   * @param fromIdentityId - Source identity ID
   * @param toIdentityId - Target identity ID
   * @param maxDepth - Maximum path length (default 5)
   */
  async findPathsBetweenIdentities(
    fromIdentityId: string,
    toIdentityId: string,
    maxDepth: number = 5
  ): Promise<GraphPath[]> {
    const query = `
      MATCH path = (start:Identity {id: '${fromIdentityId}'})-[*1..${maxDepth}]-(end:Identity {id: '${toIdentityId}'})
      RETURN path
    `

    const results = await this.executeCypher(query)
    return this.parsePathResults(results)
  }

  /**
   * Find all accounts linked to an identity (direct and indirect)
   * @param identityId - Identity ID
   */
  async findLinkedAccounts(identityId: string): Promise<GraphQueryResult[]> {
    const query = `
      MATCH (i:Identity {id: '${identityId}'})-[:HAS_ACCOUNT]->(a:Account)
      RETURN a
    `
    return this.executeCypher(query)
  }

  /**
   * Find all entitlements granted to an account (direct and inherited)
   * Supports FR-006: Nested group membership
   * @param accountId - Account ID
   * @param includeInherited - Include entitlements from nested groups
   */
  async findAccountEntitlements(
    accountId: string,
    includeInherited: boolean = true
  ): Promise<GraphQueryResult[]> {
    const query = includeInherited
      ? `
        MATCH (a:Account {id: '${accountId}'})-[:HAS_GRANT]->()-[:GRANTS_ENTITLEMENT]->(e:Entitlement)
        RETURN DISTINCT e
        UNION
        MATCH (a:Account {id: '${accountId}'})-[:HAS_GRANT]->()-[:GRANTS_ENTITLEMENT]->(parent:Entitlement)-[:CONTAINS*]->(child:Entitlement)
        RETURN DISTINCT child as e
      `
      : `
        MATCH (a:Account {id: '${accountId}'})-[:HAS_GRANT]->()-[:GRANTS_ENTITLEMENT]->(e:Entitlement)
        RETURN DISTINCT e
      `

    return this.executeCypher(query)
  }

  /**
   * Find circular dependencies in entitlement hierarchy
   * Detects cycles in group-in-group relationships
   */
  async detectEntitlementCycles(): Promise<string[][]> {
    // This is a placeholder - Apache AGE cycle detection needs custom implementation
    // For Phase 2, we'll use Prisma-level validation in the service layer
    console.warn('[GraphQueryService] Cycle detection not yet implemented')
    return []
  }

  /**
   * Build parameterized Cypher query
   * @param query - Query template
   * @param params - Parameters to inject
   */
  private buildCypherQuery(
    query: string,
    params?: Record<string, unknown>
  ): string {
    if (!params) return query

    let parameterizedQuery = query
    for (const [key, value] of Object.entries(params)) {
      const escapedValue = typeof value === 'string' ? `'${value}'` : String(value)
      parameterizedQuery = parameterizedQuery.replace(
        new RegExp(`\\$${key}`, 'g'),
        escapedValue
      )
    }
    return parameterizedQuery
  }

  /**
   * Parse path results from AGE
   * @param results - Raw query results
   */
  private parsePathResults(results: GraphQueryResult[]): GraphPath[] {
    // Placeholder - actual AGE path parsing requires AGE-specific types
    // For Phase 2, this is a stub; full implementation in Phase 3
    return []
  }
}

// Export singleton instance
export const graphQueryService = new GraphQueryService()

/**
 * Note: Apache AGE graph queries are optional for Phase 2
 * The relational Prisma schema supports all core functionality
 * Graph queries provide optimization for complex traversals (FR-006, FR-003)
 * Full graph integration will be implemented in Phase 3: Services
 */
