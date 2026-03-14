import { useEffect } from "react";
import { useGetConfig, useUpdateConfig, useListPeople, getGetConfigQueryKey } from "@workspace/api-client-react";
import { Settings2, Save, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const configSchema = z.object({
  tableCount: z.coerce.number().min(1, "Must have at least 1 table"),
  seatsPerTable: z.coerce.number().min(2, "Must have at least 2 seats per table"),
  maxTeachersPerTable: z.coerce.number().min(0, "Must be 0 or more"),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function Configuration() {
  const { data: config, isLoading: configLoading } = useGetConfig();
  const { data: peopleData } = useListPeople();
  const updateConfig = useUpdateConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      tableCount: 10,
      seatsPerTable: 4,
      maxTeachersPerTable: 1,
    }
  });

  const tableCount = watch("tableCount") || 0;
  const seatsPerTable = watch("seatsPerTable") || 0;
  const totalCapacity = tableCount * seatsPerTable;
  const totalPeople = peopleData?.people.length || 0;

  useEffect(() => {
    if (config) {
      reset(config);
    }
  }, [config, reset]);

  const onSubmit = (data: ConfigFormValues) => {
    updateConfig.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetConfigQueryKey() });
          toast({ title: "Configuration saved successfully!" });
        },
        onError: (err) => {
          toast({ title: "Failed to save config", description: err.message, variant: "destructive" });
        }
      }
    );
  };

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
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-semibold">Settings</h2>
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
                    Limits how many teachers can be seated together. Tables without teachers will get at least one senior student.
                  </p>
                  {errors.maxTeachersPerTable && <p className="text-sm text-destructive">{errors.maxTeachersPerTable.message}</p>}
                </div>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                disabled={updateConfig.isPending}
                className="w-full sm:w-auto mt-4 px-8 rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
              >
                {updateConfig.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
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
                <p className="text-white/80 text-sm font-medium mb-1">Total People Required</p>
                <p className={`text-3xl font-bold tracking-tight ${totalPeople > totalCapacity ? 'text-rose-300' : 'text-white'}`}>
                  {totalPeople}
                </p>
              </div>
              
              {totalPeople > totalCapacity && (
                <div className="bg-rose-500/20 border border-rose-400/30 rounded-xl p-3 mt-4">
                  <p className="text-sm text-rose-100 font-medium">Warning: Not enough seats for everyone! Increase tables or seats per table.</p>
                </div>
              )}
              {totalPeople < totalCapacity && (
                <div className="bg-white/10 border border-white/20 rounded-xl p-3 mt-4">
                  <p className="text-sm text-white font-medium">You have {totalCapacity - totalPeople} extra seats. They will remain empty.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
