import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';

export function useAdminEmailEvents() {
  const api = useApiClient();
  return useQuery({ queryKey: ['admin-email-events'], queryFn: () => api.get('/admin/email/events') });
}

export function useAdminEmailQueue() {
  const api = useApiClient();
  return useQuery({ queryKey: ['admin-email-queue'], queryFn: () => api.get('/admin/email/queue') });
}

export function useAdminEmailHealth() {
  const api = useApiClient();
  return useQuery({ queryKey: ['admin-email-health'], queryFn: () => api.get('/admin/email/service-health') });
}

export function useAdminEmailTemplates() {
  const api = useApiClient();
  return useQuery({ queryKey: ['admin-email-templates'], queryFn: () => api.get('/admin/email/templates') });
}

export function useAdminEmailActions() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-email-events'] });
    queryClient.invalidateQueries({ queryKey: ['admin-email-queue'] });
    queryClient.invalidateQueries({ queryKey: ['admin-email-health'] });
  };

  return {
    processQueue: useMutation({ mutationFn: () => api.post('/admin/email/queue/process', {}), onSuccess: invalidate }),
    sendTest: useMutation({
      mutationFn: (payload: { to: string; purpose?: string }) => api.post('/admin/email/send-test', payload),
      onSuccess: invalidate
    }),
    previewTemplate: useMutation({
      mutationFn: (payload: { purpose: string }) => api.post('/admin/email/templates/preview', payload)
    })
  };
}
