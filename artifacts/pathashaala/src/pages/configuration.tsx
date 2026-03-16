import { useEffect } from "react";
import { useGetConfig, useListPeople } from "@workspace/api-client-react";
import { Settings2, Save, Users, Loader2, LayoutGrid, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { logApiError } from "@/lib/logger";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const configSchema = z.object({
  tableCount: z.coerce.number().min(1, "Must have at least 1 table"),
  seatsPerTable: z.coerce.number().min(2, "Must have at least 2 seats per table"),
  maxTeachersPerTable: z.coerce.number().min(1, "Must be at least 1"),
  zoneCount: z.coerce.number().min(1, "At least 1 zone").max(20, "Maximum 20 zones"),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function Configuration() {
  const { data: config, isLoading: configLoading } = useGetConfig();
  const { data: peopleData } = useListPeople();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      tableCount: 45,
      seatsPerTable: 4,
      maxTeachersPerTable: 1,
      zoneCount: 1,
    }
  });

  const tableCount = watch("tableCount") || 0;
  const seatsPerTable = watch("seatsPerTable") || 0;
  const zoneCount = watch("zoneCount") || 1;
  const totalCapacity = tableCount * seatsPerTable;
  const totalPeople = peopleData?.people.length || 0;

  useEffect(() => {
    if (config) {
      reset({
        tableCount: (config as any).tableCount,
        seatsPerTable: (config as any).seatsPerTable,
        maxTeachersPerTable: (config as any).maxTeachersPerTable,
        zoneCount: (config as any).zoneCount ?? 1,
      });
    }
  }, [config, reset]);

  const onSubmit = async (data: ConfigFormValues) => {
    try {
      const res = await fetch(`${BASE}/api/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({ title: "Configuration saved successfully!" });
    } catch (err) {
      logApiError("Save config", err);
      toast({ title: "Failed to save config", description: (err as any).message, variant: "destructive" });
    }
  };

  // Compute zone sizes preview
  const zoneSizes: number[] = [];
  if (zoneCount > 1 && tableCount > 0) {
    const base = Math.floor(tableCount / zoneCount);
    const rem = tableCount % zoneCount;
    for (let z = 0; z < zoneCount; z++) {
      zoneSizes.push(base + (z < rem ? 1 : 0));
    }
  }

  if (configLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Table Configuration</h1>
        <p className="text-muted-foreground mt-1">Configure your dining hall parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main settings */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-semibold">Table Settings</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base">Number of Tables</Label>
                  <Input
                    type="number"
                    {...register("tableCount")}
                    className="h-12 rounded-xl text-lg px-4"
                  />
                  {errors.tableCount && <p className="text-sm text-destructive">{errors.tableCount.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-base">Seats per Table</Label>
                  <Input
                    type="number"
                    {...register("seatsPerTable")}
                    className="h-12 rounded-xl text-lg px-4"
                  />
                  {errors.seatsPerTable && <p className="text-sm text-destructive">{errors.seatsPerTable.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-base">Max Teachers per Table</Label>
                  <Input
                    type="number"
                    {...register("maxTeachersPerTable")}
                    className="h-12 rounded-xl text-lg px-4"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Valid table compositions: 1 Teacher · 1 Teacher + 1 Staff · 1 Staff + 1 Senior · 1 Teacher + 1 Staff + 1 Senior
                  </p>
                  {errors.maxTeachersPerTable && <p className="text-sm text-destructive">{errors.maxTeachersPerTable.message}</p>}
                </div>
              </div>

              {/* Zone section */}
              <div className="border-t border-border/50 pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Dining Hall Zones</p>
                    <p className="text-xs text-muted-foreground">Divide the hall into sections — class groups rotate through zones each week.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base">Number of Zones</Label>
                  <Input
                    type="number"
                    {...register("zoneCount")}
                    className="h-12 rounded-xl text-lg px-4"
                    min={1}
                    max={20}
                  />
                  <p className="text-sm text-muted-foreground">Set to 1 to disable zones (everyone can sit anywhere).</p>
                  {errors.zoneCount && <p className="text-sm text-destructive">{errors.zoneCount.message}</p>}
                </div>

                {zoneSizes.length > 0 && (
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <Info className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                      <p className="text-sm font-semibold text-violet-900">Zone Preview — {tableCount} tables → {zoneCount} zones</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {zoneSizes.map((size, i) => (
                        <div key={i} className="bg-white border border-violet-200 rounded-lg px-3 py-2 text-center min-w-[80px]">
                          <p className="text-xs text-violet-500 font-medium">Zone {i + 1}</p>
                          <p className="text-lg font-bold text-violet-800">{size}</p>
                          <p className="text-xs text-violet-400">tables</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-violet-700/70 mt-3">
                      Class groups rotate through zones weekly — Junior Mag is in Zone 1 this week, Zone 2 next week, etc.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto mt-4 px-8 rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
              >
                <Save className="w-5 h-5 mr-2" />
                Save Configuration
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-6 shadow-lg shadow-primary/20 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-display font-semibold">Capacity Check</h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Total Capacity</p>
                <p className="text-4xl font-bold tracking-tight">{totalCapacity} <span className="text-xl text-white/60 font-normal">seats</span></p>
              </div>

              <div className="h-px bg-white/20 w-full my-4" />

              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Total People</p>
                <p className={`text-3xl font-bold tracking-tight ${totalPeople > totalCapacity ? 'text-rose-300' : 'text-white'}`}>
                  {totalPeople}
                </p>
              </div>

              {totalPeople > totalCapacity && (
                <div className="bg-rose-500/20 border border-rose-400/30 rounded-xl p-3 mt-4">
                  <p className="text-sm text-rose-100 font-medium">Not enough seats! Increase tables or seats per table.</p>
                </div>
              )}
              {totalPeople > 0 && totalPeople <= totalCapacity && (
                <div className="bg-white/10 border border-white/20 rounded-xl p-3 mt-4">
                  <p className="text-sm text-white font-medium">{totalCapacity - totalPeople} extra seats will remain empty.</p>
                </div>
              )}
            </div>
          </div>

          {/* Seniors info */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-2">Who counts as a Senior?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Grade 10, 11, 12 and Senior Mag students are treated as seniors. Each table must have at least one authority (teacher or staff) or a senior student.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
