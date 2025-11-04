import { logger } from './logger';
import { getDatabase } from '../config/database';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { HealthStatus } from '../types';

let healthStatus: HealthStatus = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  services: {
    database: 'healthy',
    solana: 'healthy',
    supabase: 'healthy',
  },
  uptime: 0,
  memory: {
    used: 0,
    total: 0,
    percentage: 0,
  },
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
};

const startTime = Date.now();

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getDatabase();
    const { error } = await db.from('users').select('count').limit(1);
    return !error;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const db = getDatabase();
    const { error } = await db.rpc('health_check');
    return !error;
  } catch (error) {
    logger.error('Supabase health check failed:', error);
    return false;
  }
}

async function checkSolanaHealth(): Promise<boolean> {
  try {
    const network = process.env.SOLANA_NETWORK || 'devnet';
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(network as any);
    const connection = new Connection(rpcUrl);

    const slot = await connection.getSlot();
    return slot > 0;
  } catch (error) {
    logger.error('Solana health check failed:', error);
    return false;
  }
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  const totalMemory = require('os').totalmem();

  return {
    used: Math.round(usage.heapUsed / 1024 / 1024), // MB
    total: Math.round(totalMemory / 1024 / 1024), // MB
    percentage: Math.round((usage.heapUsed / totalMemory) * 100),
  };
}

async function updateHealthStatus() {
  const startTimeCheck = Date.now();

  const [dbHealthy, supabaseHealthy, solanaHealthy] = await Promise.all([
    checkDatabaseHealth(),
    checkSupabaseHealth(),
    checkSolanaHealth(),
  ]);

  const isHealthy = dbHealthy && supabaseHealthy && solanaHealthy;
  const checkDuration = Date.now() - startTimeCheck;

  healthStatus = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      solana: solanaHealthy ? 'healthy' : 'unhealthy',
      supabase: supabaseHealthy ? 'healthy' : 'unhealthy',
    },
    uptime: Date.now() - startTime,
    memory: getMemoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  if (!isHealthy) {
    logger.warn('Health check failed', {
      services: healthStatus.services,
      checkDuration,
    });
  } else {
    logger.debug('Health check passed', { checkDuration });
  }
}

export function startHealthChecks() {
  const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'); // 30 seconds

  // Run initial health check
  updateHealthStatus();

  // Schedule periodic health checks
  setInterval(updateHealthStatus, interval);

  logger.info(`Health checks started with ${interval}ms interval`);
}

export function getHealthStatus(): HealthStatus {
  return healthStatus;
}

export async function runHealthCheck(): Promise<HealthStatus> {
  await updateHealthStatus();
  return healthStatus;
}