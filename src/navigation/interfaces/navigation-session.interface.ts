import { Response } from 'express';

export interface NavigationSession {
  sessionId: string;
  userId: string;
  polyline: string;
  decodedCoordinates: Array<{ lat: number; lng: number }>;
  startTime: Date;
  estimatedSpeedKmh: number;
  totalDistance: number; // meters
  estimatedDuration: number; // seconds
  
  // SSE 관리
  sseClients: Response[];
  lastEventId: number;
  lastActivityAt: Date;
  
  // 상태
  status: 'active' | 'stopped';
  currentDistanceFromStart: number; // meters
}

export interface SseClient {
  response: Response;
  sessionId: string;
  connectedAt: Date;
  lastEventId: number;
}
