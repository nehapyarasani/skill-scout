import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const upload = multer({ dest: '/tmp/uploads/' });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Start Python NLP Service
  console.log("Starting Python NLP Service...");
  const pythonProcess = spawn('python3', ['server/nlp_service.py']);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[NLP Service]: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[NLP Service Error]: ${data}`);
  });

  // Wait for service to be ready (simple delay for MVP)
  await new Promise(resolve => setTimeout(resolve, 5000));

  const NLP_SERVICE_URL = 'http://localhost:5001';

  app.post(api.analysis.screenResume.path, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const jobRole = req.body.jobRole;
      if (!jobRole) {
        return res.status(400).json({ message: "Job role is required" });
      }

      const formData = new FormData();
      formData.append('file', fs.createReadStream(req.file.path));
      formData.append('job_role', jobRole);

      try {
        const response = await axios.post(`${NLP_SERVICE_URL}/analyze/resume`, formData, {
          headers: {
            ...formData.getHeaders()
          }
        });

        // Log analysis
        await storage.logAnalysis({
          type: 'resume',
          targetRole: jobRole,
          score: Math.round(response.data.matchScore),
          results: response.data
        });

        res.json(response.data);
      } catch (error: any) {
        console.error("NLP Service Error:", error.response?.data || error.message);
        res.status(500).json({ message: "Failed to analyze resume" });
      } finally {
        // Cleanup temp file
        fs.unlink(req.file.path, () => {});
      }

    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.analysis.analyzeJob.path, async (req, res) => {
    try {
      const input = api.analysis.analyzeJob.input.parse(req.body);
      
      try {
        const response = await axios.post(`${NLP_SERVICE_URL}/analyze/jd`, input);
        
        await storage.logAnalysis({
          type: 'job',
          results: response.data
        });

        res.json(response.data);
      } catch (error: any) {
        console.error("NLP Service Error:", error.response?.data || error.message);
        res.status(500).json({ message: "Failed to analyze job description" });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  return httpServer;
}
