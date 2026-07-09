// Enrolling from within the Super Admin shell lands here after "View Directory" —
// reuses the same full student directory already built at /super-admin/students
// rather than duplicating it under the admissions sub-tree.
export { default } from '@/app/(super-admin)/super-admin/students/page'
