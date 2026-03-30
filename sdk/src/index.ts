export { Hippocampus } from './client';
export { HippocampusError } from './errors';
export { logger } from './logger';
export type { LogLevel } from './logger';
export type {
  StorageType,
  StorageBackend,
  StorageConfig,
  SqliteStorageConfig,
  RedisStorageConfig,
  S3StorageConfig,
  CustomStorageConfig,
  HippocampusConfig,
  AddOptions,
} from './types';

export { SqliteStorage } from './storage/sqlite';
export { RedisStorage } from './storage/redis';
export { S3Storage } from './storage/s3';
export { CustomStorage } from './storage/custom';
