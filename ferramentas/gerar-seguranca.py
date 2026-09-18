#!/usr/bin/env python3
"""
PORTAL CRC — GERADOR DAS REGRAS DE SEGURANÇA (Fase 03)

Uso:  python ferramentas/gerar-seguranca.py

Gera, em supabase/migrations/:
  04_politicas.sql   quem pode ler e escrever em cada uma das 48 tabelas
  05_mascaras.sql    esconde salário e custo operacional de quem não é gestor

Por que dois arquivos: RLS protege LINHAS. Salário é uma COLUNA, e o Postgres
não aplica RLS por coluna. A máscara resolve isso com uma view que devolve NULL
no campo sensível para quem não é gestor — e com gatilhos que impedem que uma
gravação feita por não-gestor apague o valor que ele nem consegue enxergar.
"""

import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ENTIDADES = RAIZ / "base44" / "entities"
SAIDA = RAIZ / "supabase" / "migrations"

CAMPOS_SISTEMA = {"id", "created_date", "updated_date", "created_by", "created_by_id"}

COLUNAS_FIXAS = [
    "id", "base44_id", "created_date", "updated_date",
    "created_by", "importado_em", "criado_em", "atualizado_em",
]

# Tabelas que só gestor pode alterar: cadastros, parâmetros e tudo que vira nota.
# Agente continua lendo (precisa, para as telas funcionarem), mas não grava.
SO_GESTOR_ESCREVE = {
    "colaborador", "pontuacao", "apuracao", "elegibilidade_premio",
    "configuracao", "configuracao_home_office", "permissao_modulo",
    "config_estorno", "ciclo_trimestral", "ciclo_ferias", "equipe", "escala",
    "skill_mestre", "motivo_tratativa", "tipo_tratativa", "categoria_tratativa",
    "tipo_observacao", "etapa_jornada", "lider_tecnico", "agente_n2",
}

# Trilha de auditoria: qualquer um registra, ninguém edita nem apaga.
SO_INSERE = {"log_auditoria"}

# Campos sensíveis, por tabela. Ficam visíveis só para gestor.
MASCARAR = {
    "colaborador": ["salario", "promocoes"],
    "tratativa": ["custo_operacional_reais"],
}


def snake(nome: str) -> str:
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", nome)
    s = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", "_", s)
    return s.lower()


def carregar():
    """Devolve {tabela: [colunas na ordem do CREATE TABLE]}."""
    tabelas = {}
    for arq in sorted(ENTIDADES.glob("*.jsonc")):
        esquema = json.loads(arq.read_text(encoding="utf-8"))
        tabela = snake(esquema.get("name") or arq.stem)
        proprias = [c for c in esquema.get("properties", {}) if c not in CAMPOS_SISTEMA]
        tabelas[tabela] = COLUNAS_FIXAS + proprias
    return tabelas


CABECALHO = (
    "-- ============================================================\n"
    "-- PORTAL CRC — gerado por ferramentas/gerar-seguranca.py\n"
    "-- Não edite à mão: altere o gerador e rode de novo.\n"
    "-- ============================================================\n"
)


def gerar_politicas(tabelas) -> str:
    p = [CABECALHO, """
-- ------------------------------------------------------------------
-- QUEM É QUEM
-- ------------------------------------------------------------------
-- Descobre o papel do usuário logado cruzando o e-mail do login com o
-- cadastro em colaborador. SECURITY DEFINER porque a própria consulta
-- precisa furar o RLS de colaborador para conseguir responder — sem isso
-- teríamos uma pergunta que depende da própria resposta.

create or replace function public.papel_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.papel
  from public.colaborador c
  where lower(c.email) = lower(auth.jwt() ->> 'email')
    and coalesce(c.ativo, true)
  limit 1
$$;

create or replace function public.eh_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.papel_atual() = 'gestor', false)
$$;

-- Estar logado NÃO é o mesmo que ser da empresa.
--
-- O Supabase permite que qualquer pessoa crie uma conta de login. Se as
-- políticas dissessem apenas "quem está logado lê", bastaria alguém se
-- cadastrar sozinho para ler a base inteira de clientes — e isso vale ainda
-- mais depois que o sistema ganha um endereço público na internet.
--
-- Esta função é o que separa "tem conta" de "trabalha aqui": só passa quem
-- tem cadastro ATIVO em colaborador. Desligar alguém da empresa é, por
-- consequência, tirar o acesso.
create or replace function public.eh_colaborador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.colaborador c
    where lower(c.email) = lower(auth.jwt() ->> 'email')
      and coalesce(c.ativo, true)
  )
$$;

revoke execute on function public.papel_atual()    from anon;
revoke execute on function public.eh_gestor()      from anon;
revoke execute on function public.eh_colaborador() from anon;
grant  execute on function public.papel_atual()    to authenticated;
grant  execute on function public.eh_gestor()      to authenticated;
grant  execute on function public.eh_colaborador() to authenticated;

-- ------------------------------------------------------------------
-- POLÍTICAS POR TABELA
-- ------------------------------------------------------------------
-- Regra geral: quem é colaborador ativo lê. Escrita depende da tabela.
-- O anon (visitante sem login) não recebe nada em lugar nenhum, e quem
-- criou conta sozinho sem estar no cadastro também não.
"""]

    for tabela in sorted(tabelas):
        p.append(f"\n-- {tabela}")
        p.append(f'drop policy if exists "{tabela}_ler"      on public."{tabela}";')
        p.append(f'drop policy if exists "{tabela}_inserir"  on public."{tabela}";')
        p.append(f'drop policy if exists "{tabela}_alterar"  on public."{tabela}";')
        p.append(f'drop policy if exists "{tabela}_apagar"   on public."{tabela}";')

        p.append(
            f'create policy "{tabela}_ler" on public."{tabela}" '
            f"for select to authenticated using (public.eh_colaborador());"
        )

        if tabela in SO_INSERE:
            p.append(
                f'create policy "{tabela}_inserir" on public."{tabela}" '
                f"for insert to authenticated with check (public.eh_colaborador());"
            )
            p.append(f"-- {tabela}: sem política de update/delete — a trilha de auditoria não se apaga.")
            continue

        if tabela in SO_GESTOR_ESCREVE:
            cond = "public.eh_gestor()"
            nota = "só gestor grava"
        else:
            cond = "public.eh_colaborador()"
            nota = "qualquer colaborador ativo grava"

        p.append(f"-- {tabela}: {nota}")
        p.append(
            f'create policy "{tabela}_inserir" on public."{tabela}" '
            f"for insert to authenticated with check ({cond});"
        )
        p.append(
            f'create policy "{tabela}_alterar" on public."{tabela}" '
            f"for update to authenticated using ({cond}) with check ({cond});"
        )
        p.append(
            f'create policy "{tabela}_apagar" on public."{tabela}" '
            f"for delete to authenticated using ({cond});"
        )

    return "\n".join(p) + "\n"


def gerar_mascaras(tabelas) -> str:
    p = [CABECALHO, """
-- ------------------------------------------------------------------
-- MÁSCARA DE CAMPOS SENSÍVEIS
-- ------------------------------------------------------------------
-- O schema do Base44 dizia, na descrição de custo_operacional_reais:
--   "campo restrito: não deve ser exibido para usuários com papel 'agente'"
-- ...e a proteção era um `if` no React, com o valor chegando ao navegador
-- do agente de qualquer jeito. Aqui isso passa a valer no banco.
--
-- Como funciona: a tabela real é renomeada para <nome>_base e uma view com
-- o nome original ocupa o lugar dela. A view devolve NULL no campo sensível
-- para quem não é gestor. O app continua consultando "colaborador" e
-- "tratativa" sem saber de nada.
--
-- security_invoker = true faz o RLS da tabela de baixo valer para quem
-- consulta a view, e não para quem a criou.
"""]

    for tabela, sensiveis in MASCARAR.items():
        colunas = tabelas[tabela]
        base = f"{tabela}_base"
        faltando = [c for c in sensiveis if c not in colunas]
        if faltando:
            raise SystemExit(f"Coluna sensível inexistente em {tabela}: {faltando}")

        p.append(f"\n-- ===================== {tabela} =====================")
        p.append(f"""
do $$
begin
  if to_regclass('public.{base}') is null then
    alter table public."{tabela}" rename to "{base}";
  end if;
end $$;

drop view if exists public."{tabela}";
""")

        selects = []
        for c in colunas:
            if c in sensiveis:
                selects.append(f'  case when public.eh_gestor() then b."{c}" else null end as "{c}"')
            else:
                selects.append(f'  b."{c}"')

        p.append(f'create view public."{tabela}" with (security_invoker = true) as\nselect\n'
                 + ",\n".join(selects)
                 + f'\nfrom public."{base}" b;\n')
        p.append(f'revoke all on public."{tabela}" from anon;')
        p.append(f'grant select, insert, update, delete on public."{tabela}" to authenticated;')

        graváveis = [c for c in colunas if c not in ("id", "criado_em")]
        lista_ins = ", ".join(f'"{c}"' for c in graváveis)
        valores = ", ".join(f'new."{c}"' for c in graváveis)

        # No UPDATE, campo sensível de não-gestor volta com NULL (ele vê NULL na
        # view). Gravar esse NULL apagaria o salário real. Por isso o coalesce
        # com o valor antigo quando quem grava não é gestor.
        sets = []
        for c in graváveis:
            if c in sensiveis:
                sets.append(
                    f'    "{c}" = case when public.eh_gestor() then new."{c}" else b."{c}" end'
                )
            else:
                sets.append(f'    "{c}" = new."{c}"')

        p.append(f"""
create or replace function public."{tabela}_gravar"()
returns trigger language plpgsql security invoker as $$
declare b public."{base}"%rowtype;
begin
  if tg_op = 'INSERT' then
    insert into public."{base}" ({lista_ins}) values ({valores})
    returning * into b;
    return new;

  elsif tg_op = 'UPDATE' then
    select * into b from public."{base}" where id = old.id;
    update public."{base}" set
{chr(10).join(s + ',' for s in sets[:-1])}
{sets[-1]}
    where id = old.id;
    return new;

  elsif tg_op = 'DELETE' then
    delete from public."{base}" where id = old.id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists "{tabela}_ins" on public."{tabela}";
drop trigger if exists "{tabela}_upd" on public."{tabela}";
drop trigger if exists "{tabela}_del" on public."{tabela}";

create trigger "{tabela}_ins" instead of insert on public."{tabela}"
  for each row execute function public."{tabela}_gravar"();
create trigger "{tabela}_upd" instead of update on public."{tabela}"
  for each row execute function public."{tabela}_gravar"();
create trigger "{tabela}_del" instead of delete on public."{tabela}"
  for each row execute function public."{tabela}_gravar"();
""")

    p.append("""
-- ------------------------------------------------------------------
-- QUEBRA DA RECURSÃO
-- ------------------------------------------------------------------
-- colaborador agora é uma view, e essa view chama eh_gestor() -> papel_atual().
-- Se papel_atual() continuasse consultando "colaborador", ela chamaria a view
-- que a chama de volta, em laço infinito, e o banco travaria no primeiro
-- acesso. A função passa a ler a tabela de baixo, colaborador_base.

create or replace function public.papel_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.papel
  from public.colaborador_base c
  where lower(c.email) = lower(auth.jwt() ->> 'email')
  limit 1
$$;
""")

    return "\n".join(p) + "\n"


def main() -> None:
    tabelas = carregar()
    SAIDA.mkdir(parents=True, exist_ok=True)

    (SAIDA / "04_politicas.sql").write_text(gerar_politicas(tabelas), encoding="utf-8")
    (SAIDA / "05_mascaras.sql").write_text(gerar_mascaras(tabelas), encoding="utf-8")

    print(f"{len(tabelas)} tabelas com política de acesso")
    print(f"  só gestor escreve : {len(SO_GESTOR_ESCREVE)}")
    print(f"  só inserção       : {len(SO_INSERE)}  ({', '.join(SO_INSERE)})")
    print(f"  logado escreve    : {len(tabelas) - len(SO_GESTOR_ESCREVE) - len(SO_INSERE)}")
    print()
    for t, campos in MASCARAR.items():
        print(f"mascarado em {t}: {', '.join(campos)}")


if __name__ == "__main__":
    main()
