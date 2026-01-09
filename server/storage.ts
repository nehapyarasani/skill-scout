import { db } from "./db";
import { analysisLogs, type InsertAnalysisLog, type AnalysisLog } from "@shared/schema";

export interface IStorage {
  logAnalysis(log: InsertAnalysisLog): Promise<AnalysisLog>;
}

export class DatabaseStorage implements IStorage {
  async logAnalysis(log: InsertAnalysisLog): Promise<AnalysisLog> {
    const [result] = await db.insert(analysisLogs).values(log).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
