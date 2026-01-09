import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

import { useScreenResume } from "@/hooks/use-analysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/Layout";
import { SkillBadge } from "@/components/SkillBadge";
import { cn } from "@/lib/utils";

export default function ResumeScreener() {
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const { mutate, isPending, data, reset } = useScreenResume();

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !jobRole) return;

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobRole", jobRole);

    mutate(formData);
  };

  const handleReset = () => {
    setFile(null);
    setJobRole("");
    reset();
  };

  const chartData = data ? [
    { name: 'Match', value: data.matchScore, color: '#6366f1' }, // Indigo
    { name: 'Missing', value: 100 - data.matchScore, color: '#e2e8f0' }, // Slate-200
  ] : [];

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        <header className="space-y-2">
          <h1 className="text-4xl font-display text-slate-900">Resume Screener</h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Upload a resume and specify a target role. Our AI will analyze skill gaps and provide a match score.
          </p>
        </header>

        {!data ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-8 lg:grid-cols-2"
          >
            {/* Left Column: Input Form */}
            <Card className="glass-card p-8 border-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Target Job Role</label>
                  <Input 
                    placeholder="e.g. Senior Frontend Engineer" 
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="h-12 text-lg bg-white/50 border-slate-200 focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Upload Resume (PDF)</label>
                  <div 
                    {...getRootProps()} 
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group bg-white/50",
                      isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-300 hover:border-primary hover:bg-slate-50",
                      file ? "border-green-500 bg-green-50/50" : ""
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center gap-4">
                      {file ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <FileText className="w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-green-700">{file.name}</p>
                            <p className="text-sm text-green-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <UploadCloud className="w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-700">Click to upload or drag and drop</p>
                            <p className="text-sm text-slate-500">PDF files only, max 5MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={!file || !jobRole || isPending}
                  className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-indigo-500 hover:to-indigo-600 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing Resume...
                    </>
                  ) : (
                    "Screen Resume"
                  )}
                </Button>
              </form>
            </Card>

            {/* Right Column: Information/Illustration */}
            <div className="hidden lg:flex flex-col justify-center space-y-6 p-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Skill Extraction</h3>
                    <p className="text-sm text-slate-500">We identify both technical and soft skills.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Gap Analysis</h3>
                    <p className="text-sm text-slate-500">Discover what's missing for your target role.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Card */}
                <Card className="col-span-1 p-6 flex flex-col items-center justify-center glass-card relative overflow-hidden">
                  <h3 className="text-xl font-bold text-slate-700 mb-4">Match Score</h3>
                  <div className="w-48 h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          innerRadius={60}
                          outerRadius={80}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-4xl font-bold font-display text-primary">{data.matchScore}%</span>
                      <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-1">Match</span>
                    </div>
                  </div>
                  <p className="text-center text-sm text-slate-500 mt-4 px-4">
                    Based on typical requirements for <span className="font-semibold text-slate-700">{jobRole}</span>
                  </p>
                </Card>

                {/* Recommendation Card */}
                <Card className="col-span-1 lg:col-span-2 p-8 glass-card flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    AI Recommendation
                  </h3>
                  <div className="bg-white/50 rounded-xl p-6 border border-slate-100">
                    <p className="text-slate-700 leading-relaxed text-lg">
                      {data.recommendation}
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button variant="outline" onClick={handleReset} className="gap-2">
                      Analyze Another <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Skills Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Found Skills */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    Skills You Have
                  </h3>
                  
                  <Card className="p-6 bg-white shadow-sm border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Technical Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.techSkillsFound.length > 0 ? (
                        data.techSkillsFound.map((skill) => (
                          <SkillBadge key={skill} name={skill} type="tech" />
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-sm">No technical skills detected</span>
                      )}
                    </div>

                    <Separator className="my-6" />

                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Soft Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.softSkillsFound.length > 0 ? (
                        data.softSkillsFound.map((skill) => (
                          <SkillBadge key={skill} name={skill} type="soft" />
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-sm">No soft skills detected</span>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Missing Skills */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    Missing Skills
                  </h3>
                  
                  <Card className="p-6 bg-red-50/30 border-red-100 shadow-none">
                    <h4 className="text-sm font-semibold text-red-600/80 uppercase tracking-wider mb-4">Recommended Technical Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.missingTechSkills.length > 0 ? (
                        data.missingTechSkills.map((skill) => (
                          <SkillBadge key={skill} name={skill} type="missing" />
                        ))
                      ) : (
                        <span className="text-green-600 font-medium text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> No major technical gaps found!
                        </span>
                      )}
                    </div>

                    <Separator className="my-6 bg-red-100" />

                    <h4 className="text-sm font-semibold text-red-600/80 uppercase tracking-wider mb-4">Recommended Soft Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.missingSoftSkills.length > 0 ? (
                        data.missingSoftSkills.map((skill) => (
                          <SkillBadge key={skill} name={skill} type="missing" />
                        ))
                      ) : (
                        <span className="text-green-600 font-medium text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> No major soft skill gaps found!
                        </span>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Layout>
  );
}
