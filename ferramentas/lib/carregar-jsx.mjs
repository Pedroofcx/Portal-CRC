// Carrega um .jsx puro (sem elementos JSX de verdade, só a extensão) para os
// testes em Node puro, resolvendo o alias @/ para src/. Usa o esbuild que já
// é dependência do Vite — nada de produção depende disto.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import * as esbuild from 'esbuild';

const raizDoRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function carregarModuloJsx(caminhoAbsoluto) {
  const codigo = readFileSync(caminhoAbsoluto, 'utf8');
  const resultado = await esbuild.transform(codigo, { loader: 'jsx', format: 'esm' });
  const resolvido = resultado.code.replace(/(['"])@\/([^'"]+)\1/g, (_m, aspas, resto) => {
    const semExtensao = !/\.(js|jsx|mjs)$/.test(resto);
    const caminho = path.join(raizDoRepo, 'src', semExtensao ? `${resto}.js` : resto);
    return `${aspas}${pathToFileURL(caminho).href}${aspas}`;
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(resolvido, 'utf8').toString('base64')}`;
  return import(dataUrl);
}
