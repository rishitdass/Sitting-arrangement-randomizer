import { useState } from "react";
import { useListGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useListPeople, getListGroupsQueryKey } from "@workspace/api-client-react";
import { Users2, Plus, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

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
  const [level, setLevel] = useState(50);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const groups = groupsData?.groups || [];
  const people = peopleData?.people || [];

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setLevel(50);
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

    const payload = {
      name,
      friendshipLevel: level,
      memberPersonIds: selectedIds,
    };

    if (editingId) {
      updateGroup.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "Group updated." });
        }
      });
    } else {
      createGroup.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "Group created." });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this group?")) return;
    deleteGroup.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        toast({ title: "Group deleted." });
      }
    });
  };

  const togglePerson = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getLevelColor = (l: number) => {
    if (l < 30) return "bg-green-100 text-green-700";
    if (l < 70) return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Friendship Groups</h1>
          <p className="text-muted-foreground mt-1">
            Define relationship levels. 100% means they should never sit together.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleOpenCreate} className="gap-2 rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Create Group
          </Button>

          <DialogContent className="rounded-3xl max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
              <DialogTitle className="font-display text-xl">{editingId ? "Edit Group" : "Create Friendship Group"}</DialogTitle>
            </DialogHeader>
            
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g., The Troublemakers"
                  className="rounded-xl border-border h-12 px-4"
                />
              </div>

              <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-border">
                <div className="flex justify-between items-center">
                  <Label className="text-base">Separation Level</Label>
                  <span className={`px-3 py-1 rounded-md text-sm font-bold ${getLevelColor(level)}`}>{level}%</span>
                </div>
                <Slider 
                  value={[level]} 
                  onValueChange={v => setLevel(v[0])} 
                  max={100} 
                  step={1} 
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>0% (Don't care)</span>
                  <span>100% (Never together)</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base flex justify-between">
                  <span>Select Members</span>
                  <span className="text-primary">{selectedIds.length} selected</span>
                </Label>
                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-inner">
                  <ScrollArea className="h-[250px] w-full">
                    {people.length === 0 ? (
                      <p className="p-4 text-center text-muted-foreground">No people available.</p>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {people.map(person => (
                          <div 
                            key={person.id} 
                            className="flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
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
              <Button onClick={handleSave} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md">
                {editingId ? "Update Group" : "Save Group"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groupsLoading ? (
          <div className="col-span-full py-12 flex justify-center">
             <div className="flex items-center gap-3 text-muted-foreground">
               <ShieldAlert className="w-5 h-5 animate-pulse" /> Loading groups...
             </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-card border border-border rounded-3xl border-dashed">
            <Users2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-display font-bold text-foreground">No groups yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">Create friendship groups to ensure specific people don't sit together.</p>
          </div>
        ) : (
          groups.map(group => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              key={group.id} 
              className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              {/* Top accent line based on level */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${getLevelColor(group.friendshipLevel).split(' ')[0]}`} />
              
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold font-display">{group.name}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary bg-muted/30" onClick={() => handleOpenEdit(group)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-muted/30" onClick={() => handleDelete(group.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mb-6">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getLevelColor(group.friendshipLevel)}`}>
                  Separation: {group.friendshipLevel}%
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Members ({group.members.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.members.slice(0, 5).map(m => (
                    <Badge key={m.personId} variant="secondary" className="bg-muted/50 hover:bg-muted font-medium border-border">
                      {m.personName}
                    </Badge>
                  ))}
                  {group.members.length > 5 && (
                    <Badge variant="outline" className="text-muted-foreground bg-white border-dashed">
                      +{group.members.length - 5} more
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
