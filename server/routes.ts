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
  // Start Python Flask NLP Service
  console.log("Starting Python Flask NLP Service...");
  let pythonProcess: any = null;
  
  try {
    // Use 'python3' for broader compatibility across systems (Windows/Linux/Mac)
    pythonProcess = spawn('python3', ['server/nlp_service.py'], {
      cwd: process.cwd(),
      shell: true
    });

    pythonProcess.stdout.on('data', (data: any) => {
      console.log(`[NLP Service]: ${data}`);
    });

    pythonProcess.stderr.on('data', (data: any) => {
      console.error(`[NLP Service Error]: ${data}`);
    });

    pythonProcess.on('error', (err: any) => {
      console.error(`Failed to start NLP service: ${err.message}`);
    });

    // Wait for Flask to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (error) {
    console.error('Error starting Flask service:', error);
  }

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
          },
          timeout: 30000
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
        res.status(500).json({ message: "Failed to analyze resume: " + (error.message || 'Unknown error') });
      } finally {
        // Cleanup temp file
        fs.unlink(req.file.path, () => {});
      }

    } catch (err) {
      console.error('Resume analysis error:', err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.analysis.analyzeJob.path, async (req, res) => {
    try {
      const input = api.analysis.analyzeJob.input.parse(req.body);
      
      try {
        const response = await axios.post(`${NLP_SERVICE_URL}/analyze/jd`, input, {
          timeout: 30000
        });
        
        await storage.logAnalysis({
          type: 'job',
          results: response.data
        });

        res.json(response.data);
      } catch (error: any) {
        console.error("NLP Service Error:", error.response?.data || error.message);
        res.status(500).json({ message: "Failed to analyze job description: " + (error.message || 'Unknown error') });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        console.error('Job analysis error:', err);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  return httpServer;
}
