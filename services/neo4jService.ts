
import { TtlFile, ApiKeys, GraphData } from '../types';
import { INCOSE_DATA } from '../constants';

/**
 * Mocks the synchronization of TTL data to Neo4j.
 */
export const syncTtlToNeo4j = async (files: TtlFile[], config: ApiKeys): Promise<{ success: boolean; message: string }> => {
  if (!config.neo4jUrl || !config.neo4jPassword) {
    throw new Error("Neo4j connection settings are missing in 'Settings' tab.");
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`Syncing ${files.length} files to Neo4j at ${config.neo4jUrl}...`);
  
  return {
    success: true,
    message: `Успешно синхронизировано ${files.length} файлов с графом Neo4j.`
  };
};

/**
 * Mocks fetching the current graph structure from Neo4j.
 * Now returns the full dataset for testing.
 */
export const fetchGraphFromNeo4j = async (config: ApiKeys): Promise<GraphData> => {
  if (!config.neo4jUrl || !config.neo4jPassword) {
    throw new Error("Neo4j connection settings are missing.");
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // In a real implementation, this would run a Cypher query.
  // We return a deep clone of the updated INCOSE_DATA to simulate freshly loaded data.
  return JSON.parse(JSON.stringify(INCOSE_DATA));
};
