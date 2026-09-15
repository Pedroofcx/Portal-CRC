import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      /*
       * no-undef vem do pluginJs.configs.recommended espalhado acima — mas
       * este objeto `rules` SUBSTITUI aquele por inteiro, então a regra se
       * perdia. Sem ela, usar uma variável que não existe passa pelo lint e
       * pelo build (o esbuild não faz essa análise) e só quebra na tela do
       * usuário. Aconteceu duas vezes: `db is not defined` no
       * NavigationTracker e `Columns2 is not defined` em Tratativas.
       */
      "no-undef": "error",
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          // O ESLint 9 trata o parâmetro do catch separadamente de vars e
          // args. Sem esta linha, `catch (_error)` continua sendo cobrado,
          // e o prefixo _ — que é justamente a convenção do projeto para
          // "existe e não é usado de propósito" — não vale ali.
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },

  /*
   * src/lib e src/components/ui ficavam FORA do lint por inteiro. Faz sentido
   * para os componentes shadcn vendorizados, que trazem seu próprio estilo de
   * código — mas nossos arquivos moram nas mesmas pastas, e foi por isso que o
   * `db is not defined` do NavigationTracker (src/lib) chegou até a tela.
   *
   * Este bloco os traz de volta, mas só para a classe de erro que quebra a
   * aplicação: variável inexistente e hook usado fora de lugar. Estilo e
   * imports não utilizados continuam sem cobrança ali.
   */
  {
    files: ["src/lib/**/*.{js,jsx}", "src/components/ui/**/*.{js,jsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { react: pluginReact, "react-hooks": pluginReactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      "no-undef": "error",
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
