
export type ApiProvider = 'gigachat' | 'routerai';

// Enum for GigaChat models to fix missing export in constants.ts
export enum GigaChatModel {
  GigaChat = 'GigaChat',
  GigaChatPro = 'GigaChatPro',
  GigaChatMax = 'GigaChatMax'
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface TtlFile {
  id: string;
  name: string;
  content: string;
}

export interface OntologyNode {
  id: string;
  label: string;
  group: 'Characteristic' | 'Rule' | 'Attribute';
  definition?: string;
  rationale?: string;
  example?: string;
}

export interface OntologyLink {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: OntologyNode[];
  links: OntologyLink[];
}

export interface PromptDefinition {
  id: string;
  name: string;
  description: string;
  template: string;
}

export interface ApiKeys {
  gigachat: string;
  routerai: string;
  neo4jUrl?: string;
  neo4jUser?: string;
  neo4jPassword?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  promptId: string;
  provider: ApiProvider;
  model: string;
  timestamp: number;
}
