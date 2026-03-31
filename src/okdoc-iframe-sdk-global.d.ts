// ============================================================================
// @okdoc-ai/plugin-sdk — Iframe SDK Global Type Declarations
// ============================================================================

interface OkDocJsonSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  items?: OkDocJsonSchemaProperty | OkDocJsonSchemaProperty[];
  minItems?: number;
  maxItems?: number;
  properties?: Record<string, OkDocJsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | OkDocJsonSchemaProperty;
  oneOf?: OkDocJsonSchemaProperty[];
  anyOf?: OkDocJsonSchemaProperty[];
  allOf?: OkDocJsonSchemaProperty[];
  not?: OkDocJsonSchemaProperty;
  [key: string]: unknown;
}

interface OkDocToolInputSchema {
  type: 'object';
  properties?: Record<string, OkDocJsonSchemaProperty>;
  required?: string[];
}

interface OkDocAnnotations {
  audience?: ('user' | 'assistant')[];
  priority?: number;
  lastModified?: string;
}

interface OkDocToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

interface OkDocContentBlock {
  type: 'text' | 'image' | 'audio' | 'resource' | 'resource_link';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
  name?: string;
  description?: string;
  resource?: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
  annotations?: OkDocAnnotations;
}

interface OkDocToolResult {
  content: OkDocContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

interface OkDocToolConfig {
  description: string;
  inputSchema?: OkDocToolInputSchema;
  annotations?: OkDocToolAnnotations;
  handler: (args: Record<string, unknown>) => Promise<OkDocToolResult>;
}

interface OkDocPluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

interface OkDocInitOptions {
  id: string;
  name: string;
  description?: string;
  version: string;
  icon?: string;
  namespace: string;
  mode?: 'foreground' | 'background';
  author: OkDocPluginAuthor;
  allowedOrigins?: string[];
}

interface OkDocIframeSDK {
  init(options: OkDocInitOptions): void;
  registerTool(name: string, config: OkDocToolConfig): void;
  notify(message: string): void;
  destroy(): void;
  readonly version: number;
  readonly mcpProtocolVersion: string;
}

declare var OkDoc: OkDocIframeSDK;
