import type { NextConfig } from 'next';

const pages = process.env.GITHUB_PAGES === 'true';
const basePath = pages ? '/eco-corruption-guard' : '';
const config: NextConfig = {
  ...(pages ? { output: 'export' as const } : {}),
  basePath,
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
export default config;
