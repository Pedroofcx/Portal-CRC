import db from '@/api/db';
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { motion, AnimatePresence } from 'framer-motion';
import { Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function MotivationalQuote() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: frases = [] } = useQuery({
    queryKey: ['frases-motivacionais'],
    queryFn: () => db.entities.FraseMotivacional.filter({ ativa: true }),
  });

  useEffect(() => {
    if (frases.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % frases.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [frases.length]);

  if (frases.length === 0) return null;

  const fraseAtual = frases[currentIndex];

  return (
    <Card className="border-0 shadow-sm bg-info-soft overflow-hidden">
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex gap-4"
          >
            <Quote className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <p className="text-foreground italic text-sm md:text-base leading-relaxed">
                "{fraseAtual.texto}"
              </p>
              {fraseAtual.autor && (
                <p className="text-muted-foreground text-xs mt-2">— {fraseAtual.autor}</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}