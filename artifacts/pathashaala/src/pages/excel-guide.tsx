import { FileSpreadsheet, CheckCircle2, AlertTriangle, Download, Table2, Info } from "lucide-react";
import { motion } from "framer-motion";

const VALID_ROLES = [
  { value: "student", label: "student", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "teacher", label: "teacher", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "non_teaching_staff", label: "non_teaching_staff", color: "bg-rose-100 text-rose-800 border-rose-200" },
];

const VALID_GROUPS = [
  { value: "junior_mag", label: "junior_mag", note: "Junior Mag students" },
  { value: "senior_mag", label: "senior_mag", note: "Senior Mag students" },
  { value: "grade_9", label: "grade_9", note: "Grade 9" },
  { value: "grade_10", label: "grade_10", note: "Grade 10" },
  { value: "grade_11", label: "grade_11", note: "Grade 11 (counted as senior)" },
  { value: "grade_12", label: "grade_12", note: "Grade 12 (counted as senior)" },
];

const SAMPLE_ROWS = [
  { name: "Amit Sharma", role: "student", group: "grade_11", note: "Student in Grade 11" },
  { name: "Priya Verma", role: "student", group: "junior_mag", note: "Junior Mag student" },
  { name: "Mr. Rajesh Kumar", role: "teacher", group: "", note: "Teacher — leave column C blank" },
  { name: "Ms. Sunita Iyer", role: "non_teaching_staff", group: "", note: "Staff — leave column C blank" },
  { name: "Rohan Mehta", role: "student", group: "senior_mag", note: "Senior Mag student" },
  { name: "Ananya Nair", role: "student", group: "grade_9", note: "Grade 9 student" },
];

function downloadSampleExcel() {
  // Create a CSV blob with BOM for Excel compatibility
  const bom = "\uFEFF";
  const header = "Name,Role,StudentGroup\n";
  const rows = SAMPLE_ROWS.map(r => `${r.name},${r.role},${r.group}`).join("\n");
  const csv = bom + header + rows;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pathashaala_sample_people.csv";
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExcelGuide() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Excel Import Guide</h1>
        <p className="text-muted-foreground mt-1">Everything you need to know to bulk-upload your people list from a spreadsheet.</p>
      </div>

      {/* Quick steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { step: "1", title: "Open Excel / Google Sheets", desc: "Create a new spreadsheet or use the sample file below." },
          { step: "2", title: "Fill in 3 Columns", desc: "Name in column A, Role in column B, Student Group in column C." },
          { step: "3", title: "Upload the File", desc: 'Go to People → "Bulk Upload" → select your file → Import.' },
        ].map(item => (
          <div key={item.step} className="bg-card border border-border rounded-2xl p-5 flex gap-4 items-start shadow-sm">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
              {item.step}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sample download */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/15 text-primary">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Download Sample File</p>
            <p className="text-sm text-muted-foreground">A ready-to-use CSV with example rows for all 3 types of people.</p>
          </div>
        </div>
        <button
          onClick={downloadSampleExcel}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm shrink-0"
        >
          <Download className="w-4 h-4" />
          Download Sample
        </button>
      </div>

      {/* Visual table preview */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <Table2 className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg">What Your Spreadsheet Should Look Like</h2>
        </div>

        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Optional: You may include a header row. If your first row contains the word "Name" the system will skip it automatically.
          </p>

          <div className="border border-border rounded-xl overflow-hidden">
            {/* Spreadsheet-style header */}
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr] text-xs font-bold text-center border-b border-border bg-muted/50">
              <div className="p-2 border-r border-border text-muted-foreground">#</div>
              <div className="p-2 border-r border-border text-muted-foreground uppercase tracking-wide">A — Name</div>
              <div className="p-2 border-r border-border text-muted-foreground uppercase tracking-wide">B — Role</div>
              <div className="p-2 text-muted-foreground uppercase tracking-wide">C — StudentGroup</div>
            </div>

            {/* Optional header row */}
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr] text-sm border-b border-border/50 bg-blue-50/50">
              <div className="p-2.5 border-r border-border/50 text-center text-xs text-muted-foreground font-mono">1</div>
              <div className="p-2.5 border-r border-border/50 text-muted-foreground italic text-xs">Name (optional header)</div>
              <div className="p-2.5 border-r border-border/50 text-muted-foreground italic text-xs">Role</div>
              <div className="p-2.5 text-muted-foreground italic text-xs">StudentGroup</div>
            </div>

            {/* Data rows */}
            {SAMPLE_ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-[2rem_1fr_1fr_1fr] text-sm border-b border-border/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                <div className="p-2.5 border-r border-border/30 text-center text-xs text-muted-foreground font-mono">{i + 2}</div>
                <div className="p-2.5 border-r border-border/30 font-medium text-foreground">{row.name}</div>
                <div className="p-2.5 border-r border-border/30">
                  {row.role === "student" && <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">student</span>}
                  {row.role === "teacher" && <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">teacher</span>}
                  {row.role === "non_teaching_staff" && <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">non_teaching_staff</span>}
                </div>
                <div className="p-2.5">
                  {row.group ? (
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">{row.group}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">leave blank</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Valid values reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Roles */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-4 text-foreground">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Valid Role Values (Column B)
          </h3>
          <div className="space-y-2">
            {VALID_ROLES.map(r => (
              <div key={r.value} className="flex items-center gap-3">
                <code className={`px-2 py-1 rounded text-xs font-bold border ${r.color}`}>{r.label}</code>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted/30 rounded-xl border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Smart matching:</strong> The system also understands "Teacher", "Staff", "Non Teaching Staff" etc. — it's not case-sensitive.
            </p>
          </div>
        </div>

        {/* Student groups */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-4 text-foreground">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Valid Student Group Values (Column C)
          </h3>
          <div className="space-y-2">
            {VALID_GROUPS.map(g => (
              <div key={g.value} className="flex items-center gap-3">
                <code className="px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 w-28 shrink-0">{g.label}</code>
                <span className="text-xs text-muted-foreground">{g.note}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 p-3 bg-muted/30 rounded-xl border border-border">
            Only needed for students. Leave blank for teachers and staff.
          </p>
        </div>
      </div>

      {/* Rules and warnings */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Important Rules to Follow
        </h3>
        <ul className="space-y-2 text-sm text-amber-800">
          {[
            "Names must be unique — no two people can share the same name.",
            "Names added via Excel cannot duplicate names already in the system.",
            "Empty or blank rows are automatically skipped.",
            "Column A (Name) must not be empty — rows without a name are ignored.",
            "Only students need a StudentGroup — leave column C blank for teachers and staff.",
            "File format: .xlsx (Excel), .xls, or .csv are all accepted.",
            "Do not add extra columns before column A or the system will misread the data.",
          ].map((rule, i) => (
            <li key={i} className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">After uploading, you can still add more people</p>
            <p className="text-blue-800/80">You can mix bulk upload and manual entry. Use bulk upload for large lists (like all 120 students) and add teachers or staff one by one manually if preferred.</p>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
