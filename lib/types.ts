export enum FileType {
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  UNKNOWN = 'UNKNOWN'
}

export interface BatesNumber {
  prefix: string;
  number: number;
  formatted: string; // e.g., "DEF-0001"
}

export interface AnalysisData {
  summary: string;
  evidenceType: string; // e.g., "Body Cam", "Deposition", "Email", "Contract"
  entities: string[]; // People, Places, Organizations
  dates: string[];
  relevantFacts: string[];
  transcription?: string; // For A/V
  sentiment?: 'Hostile' | 'Cooperative' | 'Neutral';
}

export interface DiscoveryFile {
  id: string;
  file: File;
  name: string;
  type: FileType;
  batesNumber: BatesNumber;
  previewUrl: string; // Blob URL
  isProcessing: boolean;
  analysis: AnalysisData | null;
  base64Data?: string; // Cache for API calls
  mimeType: string;
}

export interface PresignedUpload {
  id: string;
  uploadUrl: string;
  objectKey: string;
}

export interface ProjectFileDescriptor {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  batesNumber: BatesNumber;
  analysis: AnalysisData | null;
  storageKey?: string;
}

export interface ProjectManifest {
  projectName: string;
  savedAt: string;
  files: ProjectFileDescriptor[];
  manifestKey?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  references?: string[]; // Array of Bates numbers referenced
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  EVIDENCE_VIEWER = 'EVIDENCE_VIEWER',
  TIMELINE = 'TIMELINE',
  CLI = 'CLI'
}
