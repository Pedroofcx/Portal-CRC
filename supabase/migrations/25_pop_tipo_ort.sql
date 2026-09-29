-- =====================================================================
-- 25 — POP ganha o tipo ORT (Orientação Técnica)
-- =====================================================================
-- Pedido de Pedro (29/09/2026): "Novo ORT" na tela de POP, mesmo layout,
-- só classificado diferente. `tipo` distingue 'pop' de 'ort'; tudo que já
-- existe vira 'pop' (o que já era).
--
-- Rodar uma vez no SQL Editor. Rodar de novo não duplica nada.
-- =====================================================================

alter table public."pop" add column if not exists "tipo" text not null default 'pop';

comment on column public."pop"."tipo" is
  '''pop'' (procedimento operacional padrão) ou ''ort'' (orientação técnica) — mesmo layout, só a classificação muda.';
