import React, { useEffect, useRef, useState } from 'react';
import db, { supabase } from '@/api/db';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImagePlus } from 'lucide-react';

const TAMANHO_MAXIMO = 2 * 1024 * 1024;
const TIPOS_ACEITOS = ['image/jpeg', 'image/png'];

/**
 * Foto de perfil pelo próprio usuário. Aceita JPG e PNG de até 2 MB.
 * O arquivo sobe pelo bucket "arquivos" e a coluna é gravada pela função
 * atualizar_minha_foto (migration 37) — o colaborador não tem permissão de
 * editar a própria linha, e abrir isso deixaria ele mudar papel e salário.
 */
export default function TrocarFotoDialog({ aberto, aoFechar, colaborador, nome }) {
  const [arquivo, setArquivo] = useState(null);
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const entrada = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!arquivo) { setPrevia(null); return undefined; }
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const fechar = () => {
    if (salvando) return;
    setArquivo(null);
    setErro('');
    aoFechar();
  };

  const escolher = (e) => {
    const escolhido = e.target.files?.[0];
    e.target.value = '';
    if (!escolhido) return;
    if (!TIPOS_ACEITOS.includes(escolhido.type)) {
      setArquivo(null);
      setErro('Use uma imagem JPG, JPEG ou PNG.');
      return;
    }
    if (escolhido.size > TAMANHO_MAXIMO) {
      setArquivo(null);
      setErro(`A foto tem ${(escolhido.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB. O máximo é 2 MB.`);
      return;
    }
    setErro('');
    setArquivo(escolhido);
  };

  const salvar = async () => {
    if (!arquivo) return;
    setSalvando(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file: arquivo });
      const { error } = await supabase.rpc('atualizar_minha_foto', { nova_url: file_url });
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast.success('Foto atualizada');
      setArquivo(null);
      aoFechar();
    } catch {
      setErro('Não consegui salvar a foto. Tente de novo em instantes.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => { if (!abrir) fechar(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Foto de perfil</DialogTitle>
          <DialogDescription>JPG, JPEG ou PNG, de até 2 MB.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <Avatar className="h-28 w-28">
            <AvatarImage src={previa || colaborador?.foto_url} className="object-cover" />
            <AvatarFallback className="bg-primary text-3xl text-primary-foreground">
              {nome?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          <input
            ref={entrada}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={escolher}
            aria-label="Escolher foto"
          />
          <Button type="button" variant="outline" onClick={() => entrada.current?.click()} disabled={salvando}>
            <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
            {arquivo ? 'Escolher outra' : 'Escolher foto'}
          </Button>

          {erro && (
            <p role="alert" className="text-center text-sm text-destructive">{erro}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button>
          <Button type="button" onClick={salvar} disabled={!arquivo || salvando}>
            {salvando ? 'Salvando...' : 'Salvar foto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
