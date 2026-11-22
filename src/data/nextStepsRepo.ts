// Repository for managing Rescue mode two-minute next step entries.

import { getDB } from './db';
import type { NextStep } from '../types';

// Create a new next step entry.
export async function createNextStep(nextStep: NextStep): Promise<void> {
  const db = await getDB();
  await db.put('nextSteps', nextStep);
}

// Retrieve a next step by ID.
export async function getNextStep(id: string): Promise<NextStep | undefined> {
  const db = await getDB();
  return db.get('nextSteps', id);
}

// Update a next step (e.g. marking it done).
export async function updateNextStep(nextStep: NextStep): Promise<void> {
  const db = await getDB();
  await db.put('nextSteps', nextStep);
}

// Delete a next step by ID.
export async function deleteNextStep(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('nextSteps', id);
}

// List all next steps ordered newest first.
export async function listNextSteps(): Promise<NextStep[]> {
  const db = await getDB();
  const allSteps = await db.getAllFromIndex('nextSteps', 'by-created');
  return allSteps.reverse();
}

// Count total next steps stored.
export async function countNextSteps(): Promise<number> {
  const db = await getDB();
  return db.count('nextSteps');
}
