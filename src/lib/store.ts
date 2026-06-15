import { TrialData } from './types';

// In-memory store for trial data.
// Trials persist for the life of the server process.
const store = new Map<string, TrialData>();

export function getTrial(id: string): TrialData | undefined {
  return store.get(id);
}

export function setTrial(id: string, data: TrialData): void {
  store.set(id, data);
}

export function getAllTrials(): TrialData[] {
  return Array.from(store.values()).filter((t) => !t.isSample);
}

export function getPublicTrials(): TrialData[] {
  return Array.from(store.values());
}