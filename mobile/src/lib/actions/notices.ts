import { callMobileApi } from '@/lib/api/client';
import type { NoticeAudience, NoticeCategory } from '@/lib/notices/types';

export type NoticeInput = { title: string; body: string; category: NoticeCategory; audience: NoticeAudience };

export async function createNoticeAction(input: NoticeInput) {
  return callMobileApi<{ id: string; publishedAt: string }>('/api/mobile/notices', input);
}

export async function updateNoticeAction(input: NoticeInput & { id: string }) {
  const { id, ...body } = input;
  return callMobileApi(`/api/mobile/notices/${id}`, body, 'PATCH');
}

export async function setNoticePublishedAction(input: { id: string; published: boolean }) {
  const { id, ...body } = input;
  return callMobileApi(`/api/mobile/notices/${id}/published`, body);
}
