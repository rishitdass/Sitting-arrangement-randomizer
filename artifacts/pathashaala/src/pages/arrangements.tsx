import { useState } from "react";
import { useGenerateArrangements, useDownloadArrangement, useDownloadAllArrangements } from "@workspace/api-client-react";
import { Calendar, Download, RefreshCw, Wand2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { formatRole } from "@/lib/formatters";

export default function Arrangements() {
  const generateMut = useGenerateArrangements();
  const { toast } = useToast();
  const [weeks, setWeeks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("0");

  const handleGenerate = () => {
    generateMut.mutate(undefined, {
      onSuccess: (data) => {
        setWeeks(data.weeks);
        setActiveTab("0");
        toast({ title: "Magic Complete!", description: data.message });
      },
      onError: (err) => {
        toast({ title: "Failed to generate", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDownloadSingle = async (weekIndex: number) => {
    try {
      const res = await fetch(`/api/arrangements/download/${weekIndex}`);
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Week_${weekIndex + 1}_Arrangement.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadAll = async () => {
    try {
      const res = await fetch(`/api/arrangements/download-all`);
      if (!res.ok) throw new Error("Failed to download zip");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `All_10_Weeks_Arrangements.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      
      <div className="bg-gradient-to-r from-primary to-primary/90 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden text-white flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[40rem] h-[40rem] bg-white/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
            <Wand2 className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold tracking-wide text-white/90">AI-POWERED GENERATION</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight">
            Generate 10 Weekly <br/><span className="text-accent">Seating Arrangements</span>
          </h1>
          <p className="text-lg text-white/80 max-w-xl leading-relaxed">
            Our engine will craft 10 distinct weekly layouts ensuring constraints (tables, teachers, and friendships) are met with minimal repetition.
          </p>
        </div>
        
        <div className="relative z-10 w-full md:w-auto">
          <Button 
            size="lg" 
            onClick={handleGenerate} 
            disabled={generateMut.isPending}
            className="w-full md:w-auto h-16 px-10 text-lg rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_40px_-10px_rgba(251,191,36,0.5)] transition-all hover:scale-105 active:scale-95"
          >
            {generateMut.isPending ? (
              <><RefreshCw className="w-6 h-6 mr-3 animate-spin" /> Working magic...</>
            ) : (
              <><Calendar className="w-6 h-6 mr-3" /> Generate Now</>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {weeks.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <h2 className="text-2xl font-display font-bold text-foreground">Generated Output</h2>
              <Button onClick={handleDownloadAll} variant="outline" className="gap-2 bg-white rounded-xl shadow-sm border-border hover:bg-muted">
                <Download className="w-4 h-4" /> Download All (ZIP)
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <ScrollArea className="w-full" type="auto">
                <TabsList className="bg-transparent h-auto p-0 flex gap-2 mb-6 w-max border-b border-border pb-px">
                  {weeks.map((week, idx) => (
                    <TabsTrigger 
                      key={idx} 
                      value={idx.toString()}
                      className={`rounded-t-xl rounded-b-none border-b-2 border-transparent px-6 py-3 font-semibold data-[state=active]:bg-white data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-sm bg-muted/30 hover:bg-muted/50`}
                    >
                      Week {week.weekNumber}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>

              {weeks.map((week, idx) => (
                <TabsContent key={idx} value={idx.toString()} className="mt-0 focus-visible:outline-none">
                  <div className="bg-card border border-border rounded-b-3xl rounded-tr-3xl shadow-sm p-6 lg:p-8">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-xl font-display font-bold">Week {week.weekNumber} Layout</h3>
                        <p className="text-muted-foreground text-sm mt-1">{week.tables.length} Tables assigned</p>
                      </div>
                      <Button onClick={() => handleDownloadSingle(idx)} size="sm" className="rounded-xl gap-2 bg-secondary hover:bg-secondary/90 text-white">
                        <FileSpreadsheet className="w-4 h-4" /> Export Excel
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {week.tables.map((table: any) => (
                        <div key={table.tableNumber} className="bg-background border border-border rounded-2xl p-5 shadow-sm flex flex-col">
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              T{table.tableNumber}
                            </div>
                            <span className="font-semibold text-foreground">Table {table.tableNumber}</span>
                          </div>
                          
                          <div className="flex-1 space-y-3">
                            {table.seats.map((seat: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground mt-0.5">
                                  {i + 1}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold leading-none mb-1 text-foreground">{seat.name}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{formatRole(seat.role)}</p>
                                </div>
                              </div>
                            ))}
                            {table.seats.length === 0 && (
                              <p className="text-sm text-muted-foreground italic p-2">Empty Table</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
