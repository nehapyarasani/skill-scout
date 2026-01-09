import { useState } from "react";
import { Loader2, Search, SlidersHorizontal, BarChart3, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";

import { useAnalyzeJob } from "@/hooks/use-analysis";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/Layout";
import { SkillBadge } from "@/components/SkillBadge";
import { Label } from "@/components/ui/label";

export default function JdAnalysis() {
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState([0.4]);
  const [topN, setTopN] = useState(10);
  
  const { mutate, isPending, data, reset } = useAnalyzeJob();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    
    mutate({
      description,
      threshold: threshold[0],
      topN,
    });
  };

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        <header className="space-y-2">
          <h1 className="text-4xl font-display text-slate-900">Job Description Analysis</h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Paste a job description to extract and prioritize key skills. Understand exactly what employers are looking for.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="glass-card p-6 border-0 sticky top-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="jd" className="text-base font-semibold">Job Description</Label>
                  <Textarea
                    id="jd"
                    placeholder="Paste the full job description here..."
                    className="min-h-[300px] text-base resize-none bg-white/50 focus:bg-white transition-all border-slate-200 focus:border-primary focus:ring-primary/20"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-sm font-medium">Confidence Threshold</Label>
                      <span className="text-sm font-bold text-primary">{threshold[0].toFixed(2)}</span>
                    </div>
                    <Slider
                      value={threshold}
                      onValueChange={setThreshold}
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      className="py-2"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="topN" className="text-sm font-medium">Top N Skills</Label>
                    <Input
                      id="topN"
                      type="number"
                      min={3}
                      max={20}
                      value={topN}
                      onChange={(e) => setTopN(parseInt(e.target.value))}
                      className="bg-white/50 border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button 
                    type="submit" 
                    disabled={!description || isPending}
                    className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Job"
                    )}
                  </Button>
                  
                  {data && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => { setDescription(""); reset(); }}
                      className="h-12"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            {data ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Tabs defaultValue="tech" className="w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold font-display text-slate-800">Analysis Results</h2>
                    <TabsList className="bg-white p-1 border border-slate-100 shadow-sm">
                      <TabsTrigger value="tech" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">Technical Skills</TabsTrigger>
                      <TabsTrigger value="soft" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700">Soft Skills</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="tech" className="space-y-6 mt-0">
                    <Card className="p-6 bg-white border-slate-100 shadow-sm">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.techSkills} layout="vertical" margin={{ left: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                              dataKey="skill" 
                              type="category" 
                              width={120} 
                              tick={{ fontSize: 12, fill: '#64748b' }}
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              cursor={{ fill: '#f1f5f9' }}
                            />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                              {data.techSkills.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`hsl(246, ${80 - index * 5}%, 60%)`} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <div className="flex flex-wrap gap-3">
                      {data.techSkills.map((item) => (
                        <SkillBadge 
                          key={item.skill} 
                          name={item.skill} 
                          type="tech" 
                          score={item.score * 100} 
                          className="text-base py-2 px-4"
                        />
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="soft" className="space-y-6 mt-0">
                    <Card className="p-6 bg-white border-slate-100 shadow-sm">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.softSkills} layout="vertical" margin={{ left: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                              dataKey="skill" 
                              type="category" 
                              width={120} 
                              tick={{ fontSize: 12, fill: '#64748b' }}
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              cursor={{ fill: '#f1f5f9' }}
                            />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                              {data.softSkills.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`hsl(340, ${80 - index * 5}%, 60%)`} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <div className="flex flex-wrap gap-3">
                      {data.softSkills.map((item) => (
                        <SkillBadge 
                          key={item.skill} 
                          name={item.skill} 
                          type="soft" 
                          score={item.score * 100}
                          className="text-base py-2 px-4"
                        />
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-slate-600 mb-2">Waiting for Input</h3>
                <p className="max-w-md">
                  Paste a job description on the left to see a breakdown of the most critical skills required for the role.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
