import { fileURLToPath } from 'node:url'

try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
} catch {
  // .env é opcional quando as variáveis já vêm do ambiente.
}
