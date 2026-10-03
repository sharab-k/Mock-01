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

// Same formal school format as the absence notice, so every message a parent
// receives — in the portal, on WhatsApp or by SMS — reads the same way.
export function gradeAlertMessage(studentName: string, rollNumber: string, subject: string, examLabel: string, score: number, maxScore: number): string {
  return `Notification of Result.

Dear Parents,
${studentName}, having GR# ${rollNumber}, has scored ${score}/${maxScore} in ${subject} (${examLabel}).

Regards,
J.E Academy.`
}
