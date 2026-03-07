// @ts-check
import { defineConfig } from 'astro/config';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const owner = process.env.GITHUB_REPOSITORY_OWNER ?? '';
const isProjectPagesRepo = repository !== '' && !repository.endsWith('.github.io');

// https://astro.build/config
export default defineConfig({
  site: owner ? `https://${owner}.github.io` : undefined,
  base: isProjectPagesRepo ? `/${repository}/` : '/',
});
