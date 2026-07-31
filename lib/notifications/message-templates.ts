// Shared between send-notification.ts (builds the message) and
// lib/attendance/roster.ts (matches notification_log rows back to a specific
// student by payload text, since the table has no student_id column and
// siblings can share a parent phone). Keeping the prefix in one place avoids
// the two call sites drifting out of sync.
export function absenceAlertPrefix(studentName: string): string {
  return `JE Academy: ${studentName} was marked absent on `
}

export function absenceAlertMessage(studentName: string, classDate: string): string {
  return `${absenceAlertPrefix(studentName)}${classDate}. Please contact the school if this is unexpected.`
}

export function gradeAlertPrefix(studentName: string, subject: string): string {
  return `JE Academy: ${studentName}'s ${subject} grade `
}

export function gradeAlertMessage(studentName: string, subject: string, examType: string, score: number, maxScore: number): string {
  return `${gradeAlertPrefix(studentName, subject)}has been recorded — ${score}/${maxScore} (${examType}).`
}
