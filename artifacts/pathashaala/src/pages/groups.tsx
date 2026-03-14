import { useState } from "react";
import { useListGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useListPeople, getListGroupsQueryKey } from "@workspace/api-client-react";
import { Users2, Plus, Pencil, Trash2, ShieldAlert, Info, Ban, AlertTriangle, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

function LevelBadge({ level }: { level: number }) {
  if (level === 100) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
      <Ban className="w-3 h-3" /> 100% — Never Together
    </span>
  );
  if (level >= 70) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
      <AlertTriangle className="w-3 h-3" /> {level}% — Strongly Avoid
    </span>
  );
  if (level >= 30) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> {level}% — Less Likely
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
      <Minus className="w-3 h-3" /> {level}% — Low Priority
    </span>
  );
}

function LevelTopBar({ level }: { level: number }) {
  if (level === 100) return <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-400 rounded-t-3xl" />;
  if (level >= 70) return <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-400 rounded-t-3xl" />;
  if (level >= 30) return <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400 rounded-t-3xl" />;
  return <div className="absolute top-0 left-0 right-0 h-1.5 bg-green-400 rounded-t-3xl" />;
}

export default function Groups() {
  const { data: groupsData, isLoading: groupsLoading } = useListGroups();
  const { data: peopleData } = useListPeople();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [level, setLevel] = useState(100);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const groups = groupsData?.groups || [];
  const people = peopleData?.people || [];

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setLevel(100);
    setSelectedIds([]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (group: any) => {
    setEditingId(group.id);
    setName(group.name);
    setLevel(group.friendshipLevel);
    setSelectedIds(group.members.map((m: any) => m.personId));
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || selectedIds.length < 2) {
      toast({ title: "Validation Error", description: "Name is required and must select at least 2 people.", variant: "destructive" });
      return;
    }

    const payload = { name, friendshipLevel: level, memberPersonIds: selectedIds };

    if (editingId) {
      updateGroup.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "Rule updated." });
        },
        onError: (err: any) => {
          toast({ title: "Failed to update", description: err.message, variant: "destructive" });
        }
      });
    } else {
      createGroup.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "Rule created." });
        },
        onError: (err: any) => {
          toast({ title: "Failed to create", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this rule?")) return;
    deleteGroup.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        toast({ title: "Rule deleted." });
      }
    });
  };

  const togglePerson = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getLevelLabel = (l: number) => {
    if (l === 100) return { text: "Hard Block — These people will NEVER sit at the same table.", color: "text-rose-700 bg-rose-50 border-rose-200" };
    if (l >= 70) return { text: "Strong Avoid — The algorithm will strongly keep them apart.", color: "text-orange-700 bg-orange-50 border-orange-200" };
    if (l >= 30) return { text: "Less Likely — They can end up together, but less often.", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { text: "Low Priority — Mostly ignored. Only minor preference to separate.", color: "text-green-700 bg-green-50 border-green-200" };
  };

  const label = getLevelLabel(level);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Seating Rules</h1>
          <p className="text-muted-foreground mt-1">
            Define groups of people who should be kept apart during dining.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 rounded-xl bg-primary shadow-lg shadow-primary/20 shrink-0">
          <Plus className="w-4 h-4" />
          Add Rule
        </Button>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-3 text-sm text-blue-900">
            <p className="font-semibold text-base">How Seating Rules Work</p>
            <p>Each rule is a group of people with a <strong>separation level (0–100%)</strong>. The level tells the arrangement engine how hard to keep them apart:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <p className="font-bold text-rose-700 flex items-center gap-1.5"><Ban className="w-4 h-4" /> 100% — Hard Block</p>
                <p className="text-blue-800/80 mt-1">Guaranteed: they will <em>never</em> be at the same table. Example: Student A and Student B are best friends → set to 100%.</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <p className="font-bold text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> 60% — Less Likely</p>
                <p className="text-blue-800/80 mt-1">The algorithm strongly prefers to separate them, but it's not absolute. Example: C, B and D are close friends → 60%.</p>
              </div>
            </div>
            <p className="text-blue-800/70 text-xs">💡 A person can be in multiple rules. Add as many rules as you need — the algorithm considers all of them together.</p>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
            <DialogTitle className="font-display text-xl">{editingId ? "Edit Rule" : "Add Seating Rule"}</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='e.g., "Best Friends Group" or "Troublemakers"'
                className="rounded-xl border-border h-12 px-4"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base">Separation Level</Label>
                <span className="text-2xl font-bold text-foreground">{level}%</span>
              </div>
              <Slider
                value={[level]}
                onValueChange={v => setLevel(v[0])}
                max={100}
                step={5}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <div className={`rounded-xl p-3 border text-sm font-medium ${label.color}`}>
                {label.text}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base flex justify-between">
                <span>Select Members <span className="text-muted-foreground font-normal">(min. 2)</span></span>
                <span className="text-primary font-bold">{selectedIds.length} selected</span>
              </Label>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <ScrollArea className="h-[220px] w-full">
                  {people.length === 0 ? (
                    <p className="p-4 text-center text-muted-foreground text-sm">No people added yet. Add people first from the People page.</p>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {people.map(person => (
                        <div
                          key={person.id}
                          className="flex items-center space-x-3 p-3 hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => togglePerson(person.id)}
                        >
                          <Checkbox
                            checked={selectedIds.includes(person.id)}
                            onCheckedChange={() => togglePerson(person.id)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-none">{person.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 capitalize">{person.role.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={createGroup.isPending || updateGroup.isPending} className="rounded-xl bg-primary text-white shadow-md">
              {editingId ? "Update Rule" : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rules list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groupsLoading ? (
          <div className="col-span-full py-12 flex justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <ShieldAlert className="w-5 h-5 animate-pulse" /> Loading rules...
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-card border border-border rounded-3xl border-dashed">
            <Users2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-display font-bold text-foreground">No rules yet</h3>
            <p className="text-muted-foreground mt-2 max-w-xs text-sm">Add rules to tell the system which people should be kept apart at dining tables.</p>
            <Button onClick={handleOpenCreate} className="mt-6 gap-2 rounded-xl">
              <Plus className="w-4 h-4" /> Add Your First Rule
            </Button>
          </div>
        ) : (
          groups.map(group => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={group.id}
              className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <LevelTopBar level={group.friendshipLevel} />

              <div className="flex justify-between items-start mb-4 pt-1">
                <h3 className="text-lg font-bold font-display leading-tight pr-2">{group.name}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary bg-muted/30 rounded-lg" onClick={() => handleOpenEdit(group)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-muted/30 rounded-lg" onClick={() => handleDelete(group.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mb-5">
                <LevelBadge level={group.friendshipLevel} />
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Members ({group.members.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.members.slice(0, 6).map(m => (
                    <Badge key={m.personId} variant="secondary" className="bg-muted/60 font-medium text-xs">
                      {m.personName}
                    </Badge>
                  ))}
                  {group.members.length > 6 && (
                    <Badge variant="outline" className="text-muted-foreground bg-white border-dashed text-xs">
                      +{group.members.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
