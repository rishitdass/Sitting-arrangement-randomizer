import { PersonRole, StudentGroup } from "@workspace/api-client-react";

export function formatRole(role: PersonRole): string {
  switch (role) {
    case PersonRole.student:
      return "Student";
    case PersonRole.teacher:
      return "Teacher";
    case PersonRole.non_teaching_staff:
      return "Non-Teaching Staff";
    default:
      return role;
  }
}

export function formatStudentGroup(group: StudentGroup | null | undefined): string {
  if (!group) return "-";
  switch (group) {
    case StudentGroup.grade_5: return "Grade 5";
    case StudentGroup.grade_6: return "Grade 6";
    case StudentGroup.grade_7: return "Grade 7";
    case StudentGroup.grade_8: return "Grade 8";
    case StudentGroup.grade_9: return "Grade 9";
    case StudentGroup.grade_10: return "Grade 10";
    case StudentGroup.grade_11: return "Grade 11";
    case StudentGroup.grade_12: return "Grade 12";
    default:
      const friendlyName = group.replace(/_/g, ' ');
      return friendlyName.charAt(0).toUpperCase() + friendlyName.slice(1);
  }
}

export function getGroupColor(group: StudentGroup | null | undefined): string {
  if (!group) return "bg-gray-100 text-gray-700 border-gray-200";
  switch (group) {
    case StudentGroup.grade_5:  return "bg-sky-100 text-sky-800 border-sky-200";
    case StudentGroup.grade_6:  return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case StudentGroup.grade_7:  return "bg-teal-100 text-teal-800 border-teal-200";
    case StudentGroup.grade_8:  return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case StudentGroup.grade_9:  return "bg-blue-100 text-blue-800 border-blue-200";
    case StudentGroup.grade_10: return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case StudentGroup.grade_11: return "bg-violet-100 text-violet-800 border-violet-200";
    case StudentGroup.grade_12: return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function getRoleColor(role: PersonRole): string {
  switch (role) {
    case PersonRole.student:
      return "bg-blue-50 text-blue-700 border-blue-200";
    case PersonRole.teacher:
      return "bg-amber-50 text-amber-700 border-amber-200";
    case PersonRole.non_teaching_staff:
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}
