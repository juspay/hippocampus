export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ALL_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function parseLogLevels(input: string): Set<LogLevel> {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === 'off' || trimmed === '') {
    return new Set();
  }

  const levels = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  return new Set(levels.filter(l => ALL_LEVELS.includes(l as LogLevel)) as LogLevel[]);
}

let enabledLevels: Set<LogLevel> | null = null;

function getEnabledLevels(): Set<LogLevel> {
  if (enabledLevels === null) {
    enabledLevels = parseLogLevels(process.env.HC_LOG_LEVEL || 'off');
  }
  return enabledLevels;
}

function shouldLog(level: LogLevel): boolean {
  return getEnabledLevels().has(level);
}

function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [HIPPOCAMPUS@__VERSION__] [${level.toUpperCase()}] ${message}`;
  if (context && Object.keys(context).length > 0) {
    return `${base} ${JSON.stringify(context)}`;
  }
  return base;
}

export const logger = {
  /**
   * Programmatically override which log levels are active.
   * Pass an array of levels or `'off'` to disable all logging.
   */
  setLevels(levels: LogLevel[] | 'off') {
    enabledLevels = levels === 'off' ? new Set<LogLevel>() : new Set(levels);
  },

  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog('debug')) console.debug(formatMessage('debug', message, context));
  },

  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog('info')) console.info(formatMessage('info', message, context));
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, context));
  },

  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog('error')) console.error(formatMessage('error', message, context));
  },
};
