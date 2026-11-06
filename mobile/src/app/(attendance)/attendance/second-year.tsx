import { SECOND_YEAR_GRADE } from '@/lib/attendance/first-year-subjects';
import { SubjectAttendanceScreen } from './first-year';

// Second Year is marked the same way as First Year — by faculty and subject.
export default function SecondYearAttendanceScreen() {
  return <SubjectAttendanceScreen grade={SECOND_YEAR_GRADE} />;
}
