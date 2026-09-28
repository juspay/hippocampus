/** Storage backend type */
export type StorageType = 'sqlite' | 'redis' | 's3' | 'custom';

export interface StorageBackend {
  get(ownerId: string): Promise<string | null>;
  set(ownerId: string, memory: string): Promise<void>;
  delete(ownerId: string): Promise<void>;
  close(): Promise<void>;
}

export interface SqliteStorageConfig {
  type: 'sqlite';
  /** Path to SQLite file. Default: ./data/hippocampus.sqlite */
  path?: string;
}

export interface RedisStorageConfig {
  type: 'redis';
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  ttl?: number;
}

/** S3 storage config */
export interface S3StorageConfig {
  type: 's3';
  bucket: string;
  prefix?: string;
}

export interface CustomStorageConfig {
  type: 'custom';
  onGet: (ownerId: string) => Promise<string | null>;
  onSet: (ownerId: string, memory: string) => Promise<void>;
  onDelete: (ownerId: string) => Promise<void>;
  onClose?: () => Promise<void>;
}

export type StorageConfig = SqliteStorageConfig | RedisStorageConfig | S3StorageConfig | CustomStorageConfig;

/** The request Hippocampus sends to the condenser's `generate()`. */
export interface CondenserGenerateOptions {
  input: { text: string };
  provider?: string;
  model?: string;
  temperature?: number;
  disableTools?: boolean;
}

/** The only field Hippocampus reads back from a condensation call. */
export interface CondenserGenerateResult {
  content?: string;
}

/**
 * Anything with a `generate()` Hippocampus can condense through — a
 * `NeuroLink` instance satisfies this structurally, and so does a host stub.
 */
export interface CondenserInstance {
  generate(options: CondenserGenerateOptions): Promise<CondenserGenerateResult | null | undefined>;
}

export interface HippocampusConfig {
  storage?: StorageConfig;
  prompt?: string;
  neurolink?: {
    provider?: string;
    model?: string;
    temperature?: number;
    /**
     * Credentials for the NeuroLink instance Hippocampus constructs for
     * condensation (`new NeuroLink({ credentials })`). Same shape as
     * NeuroLink's `NeurolinkCredentials`; typed loosely so this package does
     * not depend on NeuroLink's types. Ignored when `instance` is set.
     */
    credentials?: Record<string, unknown>;
    /**
     * Host-supplied condenser. When set, Hippocampus never constructs its own
     * NeuroLink and routes every condensation call through this object.
     */
    instance?: CondenserInstance;
  };
  maxWords?: number;
}

export interface AddOptions {
  prompt?: string;
  maxWords?: number;
}
