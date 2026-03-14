import { useState, useRef } from "react";
import { useListPeople, useCreatePerson, useDeletePerson, useBulkCreatePeople, PersonRole, StudentGroup, getListPeopleQueryKey } from "@workspace/api-client-react";
import { formatRole, formatStudentGroup, getGroupColor, getRoleColor } from "@/lib/formatters";
import { Plus, Upload, Trash2, Search, FileSpreadsheet, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

export default function People() {
  const { data: peopleData, isLoading } = useListPeople();
  const createPerson = useCreatePerson();
  const deletePerson = useDeletePerson();
  const bulkCreate = useBulkCreatePeople();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Add Person State
  const [name, setName] = useState("");
  const [role, setRole] = useState<PersonRole>(PersonRole.student);
  const [studentGroup, setStudentGroup] = useState<StudentGroup | "">("");

  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const people = peopleData?.people || [];
  const filteredPeople = people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = () => {
    if (!name.trim()) return;
    createPerson.mutate(
      { 
        data: { 
          name, 
          role, 
          studentGroup: role === PersonRole.student && studentGroup ? (studentGroup as StudentGroup) : null 
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey() });
          setIsAddOpen(false);
          setName("");
          toast({ title: "Person added successfully!" });
        },
        onError: (err) => {
          toast({ title: "Failed to add person", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to remove this person?")) return;
    deletePerson.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey() });
          toast({ title: "Person removed." });
        }
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const processUpload = async () => {
    if (!uploadFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Expected format: Name | Role | StudentGroup
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const mappedPeople = json
          .filter((row, idx) => {
            // skip completely empty rows or header rows if they contain "Name"
            if (!row[0]) return false;
            if (idx === 0 && row[0].toString().toLowerCase().includes('name')) return false;
            return true;
          })
          .map(row => {
            const roleStr = (row[1] || '').toString().toLowerCase().trim();
            const groupStr = (row[2] || '').toString().toLowerCase().trim();
            
            let resolvedRole = PersonRole.student;
            if (roleStr.includes('teacher') && !roleStr.includes('non')) resolvedRole = PersonRole.teacher;
            else if (roleStr.includes('non') || roleStr.includes('staff')) resolvedRole = PersonRole.non_teaching_staff;

            let resolvedGroup: StudentGroup | null = null;
            if (resolvedRole === PersonRole.student) {
              if (groupStr.includes('junior')) resolvedGroup = StudentGroup.junior_mag;
              else if (groupStr.includes('senior')) resolvedGroup = StudentGroup.senior_mag;
              else if (groupStr.includes('9')) resolvedGroup = StudentGroup.grade_9;
              else if (groupStr.includes('10')) resolvedGroup = StudentGroup.grade_10;
              else if (groupStr.includes('11')) resolvedGroup = StudentGroup.grade_11;
              else if (groupStr.includes('12')) resolvedGroup = StudentGroup.grade_12;
            }

            return {
              name: String(row[0]).trim(),
              role: resolvedRole,
              studentGroup: resolvedGroup
            };
          });

        bulkCreate.mutate(
          { data: { people: mappedPeople } },
          {
            onSuccess: (res) => {
              queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey() });
              setIsUploadOpen(false);
              setUploadFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
              toast({ 
                title: "Upload Complete", 
                description: `Created: ${res.created}, Skipped: ${res.skipped}. ${res.errors.length ? 'Some errors occurred.' : ''}`
              });
            },
            onError: (err) => {
              toast({ title: "Bulk upload failed", description: err.message, variant: "destructive" });
            }
          }
        );
      } catch (err) {
        toast({ title: "Error parsing Excel", description: "Please ensure the format is correct.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(uploadFile);
  };

  const studentsCount = people.filter(p => p.role === PersonRole.student).length;
  const teachersCount = people.filter(p => p.role === PersonRole.teacher).length;
  const staffCount = people.filter(p => p.role === PersonRole.non_teaching_staff).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">People Management</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage students, teachers, and staff for dining arrangements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 bg-white hover:bg-muted border-border shadow-sm rounded-xl">
                <Upload className="w-4 h-4" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">Bulk Upload from Excel</DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center flex flex-col items-center justify-center bg-muted/30">
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-foreground font-medium mb-1">Select an Excel file (.xlsx)</p>
                  <p className="text-xs text-muted-foreground mb-4">Columns: Name, Role, StudentGroup</p>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                  {uploadFile && <p className="mt-3 text-sm font-medium text-primary">{uploadFile.name}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                <Button 
                  onClick={processUpload} 
                  disabled={!uploadFile || bulkCreate.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {bulkCreate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Import Data
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20">
                <Plus className="w-4 h-4" />
                Add Person
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">Add New Person</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    placeholder="Enter name..." 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="rounded-xl border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(val) => setRole(val as PersonRole)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PersonRole.student}>Student</SelectItem>
                      <SelectItem value={PersonRole.teacher}>Teacher</SelectItem>
                      <SelectItem value={PersonRole.non_teaching_staff}>Non-Teaching Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {role === PersonRole.student && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Student Group</Label>
                    <Select value={studentGroup} onValueChange={(val) => setStudentGroup(val as StudentGroup)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={StudentGroup.junior_mag}>Junior Mag</SelectItem>
                        <SelectItem value={StudentGroup.senior_mag}>Senior Mag</SelectItem>
                        <SelectItem value={StudentGroup.grade_9}>Grade 9</SelectItem>
                        <SelectItem value={StudentGroup.grade_10}>Grade 10</SelectItem>
                        <SelectItem value={StudentGroup.grade_11}>Grade 11</SelectItem>
                        <SelectItem value={StudentGroup.grade_12}>Grade 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!name || createPerson.isPending || (role === PersonRole.student && !studentGroup)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {createPerson.isPending ? "Adding..." : "Add Person"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-muted-foreground text-sm font-medium">Total People</p>
          <p className="text-3xl font-display font-bold mt-1 text-foreground">{people.length}</p>
        </div>
        <div className="bg-card border border-blue-100 rounded-2xl p-5 shadow-sm">
          <p className="text-blue-600/80 text-sm font-medium">Students</p>
          <p className="text-3xl font-display font-bold mt-1 text-blue-900">{studentsCount}</p>
        </div>
        <div className="bg-card border border-amber-100 rounded-2xl p-5 shadow-sm">
          <p className="text-amber-600/80 text-sm font-medium">Teachers</p>
          <p className="text-3xl font-display font-bold mt-1 text-amber-900">{teachersCount}</p>
        </div>
        <div className="bg-card border border-rose-100 rounded-2xl p-5 shadow-sm">
          <p className="text-rose-600/80 text-sm font-medium">Staff</p>
          <p className="text-3xl font-display font-bold mt-1 text-rose-900">{staffCount}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search people..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-border bg-white"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="font-semibold text-foreground py-4">Name</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Role</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Group</TableHead>
                <TableHead className="text-right font-semibold text-foreground py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading people...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPeople.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No people found. Add some manually or bulk upload.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPeople.map((person) => (
                  <TableRow key={person.id} className="border-border group transition-colors">
                    <TableCell className="font-medium text-foreground py-4">{person.name}</TableCell>
                    <TableCell className="py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getRoleColor(person.role)}`}>
                        {formatRole(person.role)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      {person.studentGroup ? (
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getGroupColor(person.studentGroup)}`}>
                          {formatStudentGroup(person.studentGroup)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(person.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={deletePerson.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
}
