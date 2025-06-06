import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const devMode = (process.env.NODE_ENV === 'development');
// E.g., npx rollup -c --environment NODE_ENV:development
console.log(`${ devMode ? 'development' : 'production' } mode bundle`);

function target(input, output) { // roll up input to output
  return {
    input,
    output: {
      file: output,
      format: 'es',
      inlineDynamicImports: true,
      sourcemap: devMode ? 'inline' : false
    },
    plugins: [
      nodeResolve({browser: true, preferBuiltins: false}), // Resolve package.json imports.
      !devMode && terser({keep_classnames: true}) // minify for production.
    ]
  };
}

export default [
  target('index.mjs', 'bundle.mjs')
];

