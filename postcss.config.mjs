import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';

export default {
  plugins: [postcssImport(), tailwindcss(), autoprefixer()],
};
