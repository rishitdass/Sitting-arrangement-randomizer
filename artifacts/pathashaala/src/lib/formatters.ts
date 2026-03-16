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
    case StudentGroup.grade_5:  return "Class 5";
    case StudentGroup.grade_6:  return "Class 6";
    case StudentGroup.grade_7:  return "Class 7";
    case StudentGroup.grade_8:  return "Class 8";
    case StudentGroup.grade_9:  return "Class 9";
    case StudentGroup.grade_10: return "Class 10";
    case StudentGroup.grade_11: return "Class 11";
    case StudentGroup.grade_12: return "Class 12";
    default: return group;
  }
}

export function getGroupColor(group: StudentGroup | null | undefined): string {
  if (!group) return "bg-gray-100 text-gray-700 border-gray-200";
  switch (group) {
    case StudentGroup.grade_5:  return "bg-sky-100 text-sky-800 border-sky-200";
    case StudentGroup.grade_6:  return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case StudentGroup.grade_7:  return "bg-teal-100 text-teal-800 border-teal-200";
    case StudentGroup.grade_8:  return "bg-green-100 text-green-800 border-green-200";
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
