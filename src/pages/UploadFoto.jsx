import db from '@/api/db';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function UploadFoto({ colaborador, onSuccess, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await db.integrations.Core.UploadFile({ file });
      return result.file_url;
    },
    onSuccess: async (fileUrl) => {
      // Atualizar o colaborador com a nova foto
      await db.entities.Colaborador.update(colaborador.id, {
        foto_url: fileUrl
      });
      queryClient.invalidateQueries(['colaboradores']);
      toast.success('Foto atualizada com sucesso!');
      if (onSuccess) onSuccess(fileUrl);
    },
    onError: () => {
      toast.error('Erro ao fazer upload da foto');
      setUploading(false);
    },
  });

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo: 5MB');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    uploadMutation.mutate(file);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <Avatar className="h-32 w-32 mx-auto">
            <AvatarImage src={previewUrl || colaborador?.foto_url} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-3xl">
              {colaborador?.nome_completo?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          <div>
            <input
              type="file"
              id="foto-upload"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <label htmlFor="foto-upload">
              <Button
                type="button"
                className="cursor-pointer bg-blue-600 hover:bg-blue-700"
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar Foto
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>

          <p className="text-xs text-slate-500">
            Formatos aceitos: JPG, PNG, GIF (máx. 5MB)
          </p>

          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={uploading}>
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}