import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

// Use schemas from the API definition for type safety
type ResumeScreeningResponse = z.infer<typeof api.analysis.screenResume.responses[200]>;
type JdAnalysisResponse = z.infer<typeof api.analysis.analyzeJob.responses[200]>;
type JdAnalysisInput = z.infer<typeof api.analysis.analyzeJob.input>;

export function useScreenResume() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.analysis.screenResume.path, {
        method: api.analysis.screenResume.method,
        body: formData,
        // Content-Type header is explicitly NOT set for FormData to let browser handle boundary
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to analyze resume");
      }

      return await res.json() as ResumeScreeningResponse;
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAnalyzeJob() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: JdAnalysisInput) => {
      // Validate input client-side using Zod schema from routes
      const validated = api.analysis.analyzeJob.input.parse(data);

      const res = await fetch(api.analysis.analyzeJob.path, {
        method: api.analysis.analyzeJob.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to analyze job description");
      }

      return await res.json() as JdAnalysisResponse;
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
