import { JobWorker, type WorkerConfig } from './worker';

const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  pollIntervalMs: 2000,
  maxConcurrentJobs: 1,
  lockTimeoutMs: 10 * 60 * 1000,
};

interface WorkerManagerState {
  isRunning: boolean;
  workerId: string | null;
  startedAt: Date | null;
  jobsProcessed: number;
  jobsFailed: number;
  lastHeartbeat: Date | null;
}

interface WorkerHealth {
  status: 'healthy' | 'unhealthy' | 'stopped';
  isProcessing: boolean;
  uptimeMs: number;
  jobsProcessed: number;
  jobsFailed: number;
  lastHeartbeat: string | null;
}

class WorkerManager {
  private static instance: WorkerManager | null = null;
  private worker: JobWorker | null = null;
  private state: WorkerManagerState = {
    isRunning: false,
    workerId: null,
    startedAt: null,
    jobsProcessed: 0,
    jobsFailed: 0,
    lastHeartbeat: null,
  };
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: WorkerConfig;

  private constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };
  }

  static getInstance(config?: Partial<WorkerConfig>): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager(config);
    }
    return WorkerManager.instance;
  }

  static resetInstance(): void {
    if (WorkerManager.instance) {
      WorkerManager.instance.stop();
      WorkerManager.instance = null;
    }
  }

  start(): void {
    if (this.state.isRunning && this.worker) {
      return;
    }

    this.worker = new JobWorker(this.config);
    
    this.worker.setProgressCallback((jobId, progress, stage) => {
      this.state.lastHeartbeat = new Date();
      console.log(`Job ${jobId}: ${progress}% - ${stage}`);
    });

    this.worker.setCompleteCallback((jobId) => {
      this.state.jobsProcessed++;
      this.state.lastHeartbeat = new Date();
      console.log(`Job ${jobId} completed`);
    });

    this.worker.setErrorCallback((jobId, error) => {
      this.state.jobsFailed++;
      this.state.lastHeartbeat = new Date();
      console.error(`Job ${jobId} failed:`, error.message);
    });

    this.state.isRunning = true;
    this.state.workerId = this.worker.getWorkerId();
    this.state.startedAt = new Date();
    this.state.lastHeartbeat = new Date();

    this.startHeartbeat();
    this.worker.start();
    
    console.log(`Worker ${this.state.workerId} started`);
  }

  async stop(): Promise<void> {
    if (!this.state.isRunning || !this.worker) {
      return;
    }

    this.stopHeartbeat();
    await this.worker.stopGracefully();
    
    console.log(`Worker ${this.state.workerId} stopped`);
    
    this.state.isRunning = false;
    this.worker = null;
  }

  restart(): void {
    this.stop().then(() => {
      this.state.jobsProcessed = 0;
      this.state.jobsFailed = 0;
      this.start();
    });
  }

  getHealth(): WorkerHealth {
    const now = new Date();
    const uptimeMs = this.state.startedAt 
      ? now.getTime() - this.state.startedAt.getTime() 
      : 0;

    let status: 'healthy' | 'unhealthy' | 'stopped';
    if (!this.state.isRunning) {
      status = 'stopped';
    } else if (this.state.lastHeartbeat) {
      const heartbeatAge = now.getTime() - this.state.lastHeartbeat.getTime();
      const maxHeartbeatAge = Math.max(this.config.pollIntervalMs || 2000, 10000);
      status = heartbeatAge < maxHeartbeatAge ? 'healthy' : 'unhealthy';
    } else {
      status = 'healthy';
    }

    return {
      status,
      isProcessing: this.worker?.isProcessing() || false,
      uptimeMs,
      jobsProcessed: this.state.jobsProcessed,
      jobsFailed: this.state.jobsFailed,
      lastHeartbeat: this.state.lastHeartbeat?.toISOString() || null,
    };
  }

  getState(): WorkerManagerState {
    return { ...this.state };
  }

  isRunning(): boolean {
    return this.state.isRunning;
  }

  private startHeartbeat(): void {
    const interval = Math.max((this.config.pollIntervalMs || 2000) * 2, 10000);
    this.heartbeatInterval = setInterval(() => {
      if (this.state.isRunning) {
        this.state.lastHeartbeat = new Date();
      }
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const workerManager = WorkerManager.getInstance();

export { WorkerManager, type WorkerHealth, type WorkerManagerState };