#!/usr/bin/env python3
"""
PORTAL CRC — GERADOR DE SQL
Converte os 48 JSON Schemas do Base44 (base44/entities/*.jsonc)
em migrations Postgres para o Supabase.

Uso:  python ferramentas/gerar-sql.py

Gera, em supabase/migrations/:
  01_tabelas.sql       tabelas, tipos, defaults, índices
  02_rls.sql           bloqueio total (nada é público por acidente)
  03_restricoes.sql    NOT NULL e chaves estrangeiras — aplicar DEPOIS da importação
"""

import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ENTIDADES = RAIZ / "base44" / "entities"
SAIDA = RAIZ / "supabase" / "migrations"

# Campos que o Base44 cria sozinho em toda entidade.
CAMPOS_SISTEMA = {"id", "created_date", "updated_date", "created_by", "created_by_id"}


def snake(nome: str) -> str:
    """Tratativa -> tratativa | AcionamentoN2 -> acionamento_n2 | PDI -> pdi"""
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", nome)
    s = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", "_", s)
    return s.lower()


def tipo_sql(esquema: dict) -> str:
    t = esquema.get("type")
    fmt = esquema.get("format")
    if t == "string":
        if fmt == "date":
            return "date"
        if fmt == "date-time":
            return "timestamptz"
        return "text"
    if t == "integer":
        return "integer"
    if t == "number":
        return "numeric"
    if t == "boolean":
        return "boolean"
    if t in ("array", "object"):
        return "jsonb"
    return "text"


def literal(valor) -> str:
    if isinstance(valor, bool):
        return "true" if valor else "false"
    if isinstance(valor, (int, float)):
        return str(valor)
    if isinstance(valor, str):
        return "'" + valor.replace("'", "''") + "'"
    if isinstance(valor, (list, dict)):
        return "'" + json.dumps(valor, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "null"


def coluna(campo: str, esq: dict) -> tuple[str, list[str]]:
    """Devolve a definição da coluna e as restrições CHECK dela."""
    tipo = tipo_sql(esq)
    partes = [f'  "{campo}" {tipo}']

    if "default" in esq:
        partes.append(f"DEFAULT {literal(esq['default'])}")

    checks = []
    if esq.get("enum"):
        valores = ", ".join(literal(v) for v in esq["enum"])
        checks.append(f'CHECK ("{campo}" IS NULL OR "{campo}" IN ({valores}))')
    if esq.get("maxLength"):
        checks.append(f'CHECK ("{campo}" IS NULL OR char_length("{campo}") <= {esq["maxLength"]})')

    return " ".join(partes), checks


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    arquivos = sorted(ENTIDADES.glob("*.jsonc"))
    if not arquivos:
        raise SystemExit(f"Nenhum schema encontrado em {ENTIDADES}")

    tabelas_sql, rls_sql, restricoes_sql = [], [], []
    resumo = []

    cabecalho = (
        "-- ============================================================\n"
        "-- PORTAL CRC — gerado por ferramentas/gerar-sql.py\n"
        "-- Não edite à mão: altere o schema ou o gerador e rode de novo.\n"
        "-- ============================================================\n\n"
    )

    tabelas_sql.append(cabecalho)
    tabelas_sql.append('create extension if not exists "pgcrypto";\n\n')

    rls_sql.append(cabecalho)
    rls_sql.append(
        "-- Liga RLS em todas as tabelas SEM criar nenhuma política.\n"
        "-- Efeito: ninguém lê nem escreve pela API até a Fase 03 definir as regras.\n"
        "-- No Supabase, tabela sem RLS fica exposta na API pública — este arquivo\n"
        "-- existe para que isso nunca aconteça por descuido.\n\n"
    )

    restricoes_sql.append(cabecalho)
    restricoes_sql.append(
        "-- APLICAR SOMENTE DEPOIS DA IMPORTAÇÃO DOS DADOS.\n"
        "-- Dado histórico costuma ter campos obrigatórios em branco; se estas\n"
        "-- restrições existissem antes, a importação falharia linha a linha.\n\n"
    )

    for arq in arquivos:
        esquema = json.loads(arq.read_text(encoding="utf-8"))
        entidade = esquema.get("name") or arq.stem
        tabela = snake(entidade)
        props = esquema.get("properties", {})
        obrigatorios = esquema.get("required", [])

        linhas = [
            '  "id" uuid primary key default gen_random_uuid()',
            '  "base44_id" text unique',            # a ponte com o sistema antigo
            '  "created_date" timestamptz',         # datas originais do Base44
            '  "updated_date" timestamptz',
            '  "created_by" text',
            '  "importado_em" timestamptz',
            '  "criado_em" timestamptz not null default now()',
            '  "atualizado_em" timestamptz not null default now()',
        ]
        checks, indices = [], []

        for campo, esq in props.items():
            if campo in CAMPOS_SISTEMA:
                continue
            definicao, chks = coluna(campo, esq)
            linhas.append(definicao)
            checks.extend(chks)
            if campo.endswith("_id") or campo in ("status", "email", "ativo", "excluida"):
                indices.append(
                    f'create index if not exists "ix_{tabela}_{campo}" '
                    f'on public."{tabela}" ("{campo}");'
                )

        corpo = ",\n".join(linhas + [f"  {c}" for c in checks])
        tabelas_sql.append(
            f"-- {entidade}  ({len(props)} campos)\n"
            f'create table if not exists public."{tabela}" (\n{corpo}\n);\n'
        )
        tabelas_sql.append(
            f'create index if not exists "ix_{tabela}_base44_id" '
            f'on public."{tabela}" ("base44_id");'
        )
        if indices:
            tabelas_sql.append("\n".join(indices))
        tabelas_sql.append("")

        rls_sql.append(f'alter table public."{tabela}" enable row level security;')

        for campo in obrigatorios:
            if campo in props and campo not in CAMPOS_SISTEMA:
                restricoes_sql.append(
                    f'alter table public."{tabela}" '
                    f'alter column "{campo}" set not null;'
                )

        resumo.append((entidade, tabela, len(props), len(obrigatorios)))

    (SAIDA / "01_tabelas.sql").write_text("\n".join(tabelas_sql), encoding="utf-8")
    (SAIDA / "02_rls.sql").write_text("\n".join(rls_sql) + "\n", encoding="utf-8")
    (SAIDA / "03_restricoes.sql").write_text("\n".join(restricoes_sql) + "\n", encoding="utf-8")

    largura = max(len(e) for e, _, _, _ in resumo)
    print(f"{len(resumo)} tabelas geradas em supabase/migrations/\n")
    print(f"{'ENTIDADE'.ljust(largura)}  {'TABELA'.ljust(largura)}  CAMPOS  OBRIG.")
    for ent, tab, n, o in resumo:
        print(f"{ent.ljust(largura)}  {tab.ljust(largura)}  {n:>6}  {o:>6}")
    print(f"\nTotal de campos mapeados: {sum(n for _, _, n, _ in resumo)}")


if __name__ == "__main__":
    main()
