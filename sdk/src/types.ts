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

export interface HippocampusConfig {
  storage?: StorageConfig;
  prompt?: string;
  neurolink?: {
    provider?: string;
    model?: string;
    temperature?: number;
  };
  maxWords?: number;
}
