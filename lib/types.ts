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

export enum CasePerspective {
  CLIENT = 'client',
  DEFENSE_SUPPORT = 'defense_support',
  PLAINTIFF_SUPPORT = 'plaintiff_support',
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
  analysisError?: string | null;
  // Cloud storage fields
  cloudDocumentId?: string; // Document ID in Supabase
  storagePath?: string; // Path in Supabase Storage
  signedUrl?: string; // Signed URL for accessing file
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
  casePerspective?: CasePerspective;
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

// Cloud database types
export interface Project {
  id: string;
  name: string;
  description?: string;
  bates_prefix: string;
  bates_counter: number;
  created_at: string;
  updated_at: string;
}

export interface CloudDocument {
  id: string;
  project_id: string;
  name: string;
  mime_type: string;
  file_type: string;
  file_size?: number;
  bates_prefix: string;
  bates_number: number;
  bates_formatted: string;
  storage_path: string;
  analysis?: AnalysisData;
  status: 'processing' | 'complete' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}
