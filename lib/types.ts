export interface UserSession {
  userId: string;
  csvPath?: string;
  csvBuffer?: Buffer;
  conversationHistory: Message[];
  analysisResults?: AnalysisResults;
  lastActivity: Date;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnalysisResults {
  reasoning: string;
  sqlQueries: ToolCallResult[];
  webResearch: ToolCallResult[];
  charts: ToolCallResult[];
  statistics: ToolCallResult[];
}

export interface ToolCallResult {
  toolName: string;
  args: any;
  result: any;
}

export interface TwilioWebhookPayload {
  From: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export interface E2BAgentInput {
  csvBuffer: Buffer;
  userMessage: string;
  conversationHistory: Message[];
}

export interface E2BAgentOutput {
  summary: string;
  charts: Buffer[];  // Array of chart image buffers from matplotlib
  externalContext?: string;
  structuredReport?: ReportData;
  insights: any;     // Raw insights from agent
}

export interface ReportChart {
  title: string;
  bullets: string[];
}

export interface ReportData {
  summary: string;
  kpis: string[];
  charts: ReportChart[];
  externalContext?: string[];
  nextSteps?: string[];
  additionalDetails?: string[];
}
