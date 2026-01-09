import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analysisLogs = pgTable("analysis_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'resume' or 'job'
  targetRole: text("target_role"),
  score: integer("score"),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnalysisLogSchema = createInsertSchema(analysisLogs).omit({ 
  id: true, 
  createdAt: true 
});

export type AnalysisLog = typeof analysisLogs.$inferSelect;
export type InsertAnalysisLog = z.infer<typeof insertAnalysisLogSchema>;

// Input Schemas for API
export const resumeScreeningInput = z.object({
  jobRole: z.string().min(1, "Job role is required"),
  // File handling is done via FormData, not JSON schema validation directly
});

export const jdAnalysisInput = z.object({
  description: z.string().min(10, "Job description must be at least 10 characters"),
  topN: z.coerce.number().default(10),
  threshold: z.coerce.number().default(0.4),
});

// Response Schemas
export const resumeScreeningResponse = z.object({
  matchScore: z.number(),
  techSkillsFound: z.array(z.string()),
  softSkillsFound: z.array(z.string()),
  missingTechSkills: z.array(z.string()),
  missingSoftSkills: z.array(z.string()),
  recommendation: z.string(),
});

export const jdAnalysisResponse = z.object({
  techSkills: z.array(z.object({ skill: z.string(), score: z.number() })),
  softSkills: z.array(z.object({ skill: z.string(), score: z.number() })),
});
