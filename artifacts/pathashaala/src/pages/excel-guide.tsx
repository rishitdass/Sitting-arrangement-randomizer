import { FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";

export default function ExcelGuide() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl space-y-8">
      
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Excel Import Guide</h1>
        <p className="text-muted-foreground mt-1">Learn how to format your data for seamless bulk uploads.</p>
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-green-100 text-green-700">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-bold">Expected Format</h2>
        </div>

        <p className="text-foreground leading-relaxed mb-6">
          The system expects a standard Excel file (.xlsx or .csv) with 3 columns. A header row is optional, but if the first row contains the word "Name", it will be skipped automatically.
        </p>

        <div className="border border-border rounded-2xl overflow-hidden mb-8 shadow-inner bg-background">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-foreground">Column A: Name</TableHead>
                <TableHead className="font-bold text-foreground">Column B: Role</TableHead>
                <TableHead className="font-bold text-foreground">Column C: Student Group</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">John Doe</TableCell>
                <TableCell><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">student</span></TableCell>
                <TableCell><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-semibold">senior_mag</span></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Jane Smith</TableCell>
                <TableCell><span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-semibold">teacher</span></TableCell>
                <TableCell className="text-muted-foreground italic">Leave blank</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Bob Wilson</TableCell>
                <TableCell><span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-xs font-semibold">non_teaching_staff</span></TableCell>
                <TableCell className="text-muted-foreground italic">Leave blank</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-muted/30 p-5 rounded-2xl border border-border">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Valid Values
            </h3>
            <ul className="space-y-4 text-sm">
              <li>
                <span className="font-bold block mb-1">Roles:</span>
                <code className="bg-white border border-border px-1.5 py-0.5 rounded">student</code>, 
                <code className="bg-white border border-border px-1.5 py-0.5 rounded ml-1">teacher</code>, 
                <code className="bg-white border border-border px-1.5 py-0.5 rounded ml-1">non_teaching_staff</code>
                <p className="text-muted-foreground text-xs mt-1">(The system is smart enough to handle "Teacher" or "Staff")</p>
              </li>
              <li>
                <span className="font-bold block mb-1">Student Groups:</span>
                <code className="bg-white border border-border px-1.5 py-0.5 rounded">junior_mag</code>, 
                <code className="bg-white border border-border px-1.5 py-0.5 rounded ml-1">senior_mag</code>, 
                <code className="bg-white border border-border px-1.5 py-0.5 rounded ml-1">grade_9</code> through <code className="bg-white border border-border px-1.5 py-0.5 rounded">grade_12</code>
              </li>
            </ul>
          </div>

          <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Important Rules
            </h3>
            <ul className="space-y-3 text-sm text-rose-800/80">
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" /> Names must be absolutely unique across all lists.</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" /> Empty rows will be ignored automatically.</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" /> Only students need a Student Group assigned.</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" /> Do not include hidden columns before Name.</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
