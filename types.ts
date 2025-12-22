export enum Condition {
  OK = 'OK',
  DENT = 'DENT',
  BROKEN = 'BROKEN',
  MISSING = 'MISSING',
}

export interface PhotoData {
  id: string; // Unique ID for UI handling
  file: File;
  previewUrl: string;
  base64: string; // Full string including data: prefix for preview, stripped for payload
  mime: string;
  name: string;
}

export interface CarReturnPayload {
  flowId: string;
  taskId: string;
  roomId: string;
  assetType: 'FRIDGE' | 'CAR';
  inspector: string;
  returned: boolean;
  conditionAfter: Condition;
  notes: string;
  deduction?: number;
  photos: {
    name: string;
    mime: string;
    base64: string; // Stripped
  }[];
  signature?: string; // Base64 stripped
}

export interface UrlParams {
  flowId: string | null;
  taskId: string | null;
  roomId: string | null;
  assetType: string | null;
}

export interface TaskSummary {
  taskId: string;
  type: string;
  status: string;
}

export interface FlowDetailResponse {
  ok: boolean;
  flow?: {
    flowId: string;
    roomId: string;
    status: string;
  };
  tasks?: TaskSummary[];
}
