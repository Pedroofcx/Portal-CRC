import React, { useMemo, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuloDocCard from './ModuloDocCard';
import {
  CATEGORIAS, TODOS_MODULOS, gerarMarkdown, gerarJson,
  resumoDoSistema, secoesArquitetura, secoesDeRegras, secoesDeOperacao, legadoParaRemover,
  gruposDeTabelas, tabelasSemEntidade, funcoesDoBanco, gatilhosDoBanco, objetosEspeciais,
  migracoes, pontosDeAtencao,
} from './gerarMarkdown';

const contem = (objeto, termo) => !termo || JSON.stringify(objeto).toLowerCase().includes(termo);

function baixar(conteudo, tipo, extensao) {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `documentacao_tecnica_portal_crc_${new Date().toISOString().slice(0, 10)}.${extensao}`;
  a.click();
  URL.revokeObjectURL(url);
}

function Tabela({ colunas, linhas }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>{colunas.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-t border-border align-top">
              {l.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Secao({ secao }) {
  return (
    <section id={secao.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-base font-semibold text-foreground">{secao.titulo}</h3>
      {secao.fonte && <p className="text-xs text-muted-foreground">Fonte no código: {secao.fonte}</p>}
      {(secao.paragrafos ?? []).map((p, i) => <p key={i} className="text-sm text-foreground">{p}</p>)}
      {secao.itens?.length > 0 && (
        <ul className="space-y-2 text-sm">
          {secao.itens.map((i) => (
            <li key={i.rotulo}>
              <span className="font-medium text-foreground">{i.rotulo}.</span>{' '}
              <span className="text-muted-foreground">{i.texto}</span>
            </li>
          ))}
        </ul>
      )}
      {secao.tabela && <Tabela {...secao.tabela} />}
    </section>
  );
}

const Vazio = ({ busca }) => (
  <p className="py-10 text-center text-muted-foreground">Nada encontrado para "{busca}"</p>
);

function ListaDeSecoes({ secoes, busca }) {
  if (!secoes.length) return <Vazio busca={busca} />;
  return <div className="space-y-4">{secoes.map((s) => <Secao key={s.id} secao={s} />)}</div>;
}

function AbaBanco({ termo, busca }) {
  const grupos = gruposDeTabelas
    .map((g) => ({ ...g, tabelas: g.tabelas.filter((t) => contem(t, termo)) }))
    .filter((g) => g.tabelas.length);
  const funcoes = funcoesDoBanco.filter((f) => contem(f, termo));
  const gatilhos = gatilhosDoBanco.filter((g) => contem(g, termo));
  const objetos = objetosEspeciais.filter((o) => contem(o, termo));
  const migs = migracoes.filter((m) => contem(m, termo));
  const pontos = pontosDeAtencao.filter((p) => contem(p, termo));
  if (![grupos, funcoes, gatilhos, objetos, migs, pontos].some((l) => l.length)) return <Vazio busca={busca} />;

  return (
    <div className="space-y-6">
      {pontos.length > 0 && (
        <section className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-semibold text-foreground">Pontos de atenção</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">{pontos.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </section>
      )}
      {grupos.map((g) => (
        <section key={g.id} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{g.nome}</h3>
          <Tabela
            colunas={['Tabela', 'O que guarda', 'Quem lê', 'Quem escreve']}
            linhas={g.tabelas.map((t) => [t.tabela, t.descricao, t.leitura, t.escrita])}
          />
        </section>
      ))}
      {!termo && (
        <p className="text-sm text-muted-foreground">
          Sem entidade na API (só pelo SQL): {tabelasSemEntidade.join(', ')}.
        </p>
      )}
      {funcoes.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Funções</h3>
          <Tabela colunas={['Função', 'Migration', 'O que faz']} linhas={funcoes.map((f) => [f.nome, f.migration, f.descricao])} />
        </section>
      )}
      {gatilhos.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gatilhos</h3>
          <Tabela
            colunas={['Gatilho', 'Tabela e momento', 'O que faz']}
            linhas={gatilhos.map((g) => [g.nome, `${g.tabela}, ${g.quando} (migration ${g.migration})`, g.descricao])}
          />
        </section>
      )}
      {objetos.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Objetos especiais</h3>
          <Tabela colunas={['Objeto', 'Descrição']} linhas={objetos.map((o) => [o.nome, o.descricao])} />
        </section>
      )}
      {migs.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Migrations</h3>
          <Tabela colunas={['Nº', 'Título', 'O que faz']} linhas={migs.map((m) => [m.n, m.titulo, m.descricao])} />
        </section>
      )}
    </div>
  );
}

export default function DocumentacaoTecnica() {
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();

  const modulos = useMemo(() => TODOS_MODULOS.filter((m) => contem(m, termo)), [termo]);
  const arquitetura = useMemo(() => secoesArquitetura.filter((s) => contem(s, termo)), [termo]);
  const regras = useMemo(() => secoesDeRegras.filter((s) => contem(s, termo)), [termo]);
  const operacao = useMemo(() => secoesDeOperacao.filter((s) => contem(s, termo)), [termo]);
  const legado = useMemo(() => legadoParaRemover.filter((l) => contem(l, termo)), [termo]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Como o sistema é hoje: módulos, banco de dados, regras de negócio e operação. Escrita para quem
        vai mantê-lo. Um teste (npm run lint) falha se algo aqui citar o que não existe ou se algo
        existir sem estar descrito.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar módulo, tabela, função, regra..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => baixar(JSON.stringify(gerarJson(), null, 2), 'application/json', 'json')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar JSON
          </Button>
          <Button onClick={() => baixar(gerarMarkdown(), 'text/markdown', 'md')}>
            <Download className="mr-2 h-4 w-4" />
            Baixar .md
          </Button>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="banco">Banco de dados</TabsTrigger>
          <TabsTrigger value="regras">Regras</TabsTrigger>
          <TabsTrigger value="operacao">Operação</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          {!termo && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-base font-semibold text-foreground">{resumoDoSistema.nome}</h3>
              <p className="mt-1 text-sm text-foreground">{resumoDoSistema.descricao}</p>
            </section>
          )}
          <ListaDeSecoes secoes={arquitetura} busca={busca} />
        </TabsContent>

        <TabsContent value="modulos" className="space-y-6">
          {modulos.length === 0 && <Vazio busca={busca} />}
          {CATEGORIAS.map((categoria) => {
            const daCategoria = modulos.filter((m) => m.categoria === categoria);
            if (!daCategoria.length) return null;
            return (
              <div key={categoria}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{categoria}</h3>
                <Accordion type="multiple">
                  {daCategoria.map((m) => <ModuloDocCard key={m.id} modulo={m} />)}
                </Accordion>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="banco"><AbaBanco termo={termo} busca={busca} /></TabsContent>

        <TabsContent value="regras"><ListaDeSecoes secoes={regras} busca={busca} /></TabsContent>

        <TabsContent value="operacao" className="space-y-4">
          <ListaDeSecoes secoes={operacao} busca={busca} />
          {legado.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Legado para remover</h3>
              <Tabela colunas={['Item', 'Por quê']} linhas={legado.map((l) => [l.item, l.motivo])} />
            </section>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
