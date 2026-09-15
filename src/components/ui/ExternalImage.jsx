import React, { useState } from 'react';
import { ImageOff, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente para renderizar imagens externas (incluindo Google Drive)
 * - Detecta e converte links do Google Drive para formato direto
 * - Mostra feedback de erro claro
 * - Suporta links diretos de imagem
 */
export default function ExternalImage({ 
  src, 
  alt = 'Imagem', 
  className = '',
  size = 'md',
  rounded = true 
}) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground",
        size === 'sm' && 'w-16 h-16',
        size === 'md' && 'w-24 h-24',
        size === 'lg' && 'w-32 h-32',
        size === 'xl' && 'w-48 h-48',
        rounded && 'rounded-full',
        className
      )}>
        <ImageOff className="w-6 h-6" />
      </div>
    );
  }

  // Converter link do Google Drive para formato direto
  const getDirectImageUrl = (url) => {
    if (!url) return url;
    
    // Padrão: https://drive.google.com/file/d/FILE_ID/view
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }
    
    // Padrão: https://drive.google.com/open?id=FILE_ID
    const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (openMatch) {
      return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
    }
    
    return url;
  };

  const imageUrl = getDirectImageUrl(src);

  if (error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-destructive/10 text-destructive p-4 border-2 border-destructive/25",
        size === 'sm' && 'w-16 h-16',
        size === 'md' && 'w-24 h-24',
        size === 'lg' && 'w-32 h-32',
        size === 'xl' && 'w-48 h-48',
        rounded && 'rounded-full',
        className
      )}>
        <ImageOff className="w-6 h-6 mb-1" />
        <p className="text-xs text-center">Erro ao carregar</p>
        <a 
          href={src} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs underline mt-1 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          Ver link <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden bg-muted",
      size === 'sm' && 'w-16 h-16',
      size === 'md' && 'w-24 h-24',
      size === 'lg' && 'w-32 h-32',
      size === 'xl' && 'w-48 h-48',
      rounded && 'rounded-full',
      className
    )}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-6 h-6 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-cover"
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        crossOrigin="anonymous"
      />
    </div>
  );
}

/**
 * Validar se o link é válido para imagem
 */
export function validateImageUrl(url) {
  if (!url) return { valid: false, message: 'URL não informada' };
  
  // Links diretos de imagem
  const directImagePattern = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i;
  if (directImagePattern.test(url)) {
    return { valid: true };
  }
  
  // Links do Google Drive
  if (url.includes('drive.google.com')) {
    if (url.includes('/file/d/') || url.includes('open?id=')) {
      return { 
        valid: true, 
        message: 'Link do Google Drive detectado. Certifique-se de que o arquivo está com permissão "Qualquer pessoa com o link"'
      };
    }
    return { 
      valid: false, 
      message: 'Formato do link do Google Drive inválido. Use o formato: https://drive.google.com/file/d/ID_DO_ARQUIVO/view' 
    };
  }
  
  // Aceitar outros links (pode ser URL de CDN, etc)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { 
      valid: true, 
      message: 'Tentaremos carregar a imagem. Se não funcionar, verifique se a URL é pública e está acessível.'
    };
  }
  
  return { 
    valid: false, 
    message: 'URL deve começar com http:// ou https://' 
  };
}