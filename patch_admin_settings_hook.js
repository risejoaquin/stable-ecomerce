import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminSettingsPage.tsx', 'utf-8');

code = code.replace(
  `import { toast } from 'react-hot-toast';`,
  `import { toast } from 'react-hot-toast';\nimport { useUpdateStoreConfig } from '../../hooks/useUpdateStoreConfig';`
);

const oldMutation = `const updateConfig = useMutation({
    mutationFn: (config: any) => apiClient.put('/admin/store/config', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      queryClient.invalidateQueries({ queryKey: ['admin-store'] });
      toast.success('Settings saved successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save settings');
    }
  });`;

const newMutation = `const updateConfigBase = useUpdateStoreConfig();
  const updateConfig = {
    isPending: updateConfigBase.isPending,
    mutate: (config: any) => {
      updateConfigBase.mutate(config, {
        onSuccess: () => toast.success('Settings saved successfully'),
        onError: (err: any) => toast.error(err.message || 'Failed to save settings')
      });
    }
  };`;

if (code.includes(oldMutation)) {
    code = code.replace(oldMutation, newMutation);
}

fs.writeFileSync('src/pages/admin/AdminSettingsPage.tsx', code);
