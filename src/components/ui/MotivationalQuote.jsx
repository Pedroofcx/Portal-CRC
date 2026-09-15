const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

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
    <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50 overflow-hidden">
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
            <Quote className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-slate-700 italic text-sm md:text-base leading-relaxed">
                "{fraseAtual.texto}"
              </p>
              {fraseAtual.autor && (
                <p className="text-slate-500 text-xs mt-2">— {fraseAtual.autor}</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}