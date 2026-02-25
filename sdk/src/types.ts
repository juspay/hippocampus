/** Storage backend type */
export type StorageType = 'sqlite' | 'redis' | 's3';

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
  /**
   * Key prefix (folder path). The ownerId is appended to this.
   * Default: 'hippocampus/memories/'
   *
   * Example: prefix='app/memories/' + ownerId='user-123'
   *   → s3://bucket/app/memories/user-123
   */
  prefix?: string;
}

export type StorageConfig = SqliteStorageConfig | RedisStorageConfig | S3StorageConfig;

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


