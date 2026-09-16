// Shared between send-notification.ts (builds the message) and
// lib/attendance/roster.ts (matches notification_log rows back to a specific
// student by payload text, since the table has no student_id column and
// siblings can share a parent phone). Keeping the prefix in one place avoids
// the two call sites drifting out of sync.
export function absenceAlertPrefix(studentName: string): string {
  return `Notification of Absence.\n\nDear Parents,\n${studentName}, `
}

function absenceDateLabel(classDate: string): string {
  return new Date(`${classDate}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function absenceAlertMessage(studentName: string, rollNumber: string, classDate: string): string {
  return `${absenceAlertPrefix(studentName)}having GR# ${rollNumber}, is absent today (${absenceDateLabel(classDate)}). Kindly ensure they cover the missed work.\n\nRegards,\nJ.E Academy.`
}

export function gradeAlertPrefix(studentName: string, subject: string): string {
  return `JE Academy: ${studentName}'s ${subject} grade `
}

export function gradeAlertMessage(studentName: string, subject: string, examType: string, score: number, maxScore: number): string {
  return `${gradeAlertPrefix(studentName, subject)}has been recorded — ${score}/${maxScore} (${examType}).`
}
