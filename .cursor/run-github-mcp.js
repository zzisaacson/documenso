#!/usr/bin/env node
/**
 * Runs the GitHub MCP server via Docker with env vars loaded from .cursor/mcp-secrets.json.
 * Copy .cursor/mcp-secrets.example.json to .cursor/mcp-secrets.json and fill in your keys.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const secretsPath = path.join(process.cwd(), '.cursor', 'mcp-secrets.json');

if (!fs.existsSync(secretsPath)) {
  console.error(
    '[MCP] Missing .cursor/mcp-secrets.json. Copy from .cursor/mcp-secrets.example.json and add your keys.'
  );
  process.exit(1);
}

let secrets = {};
try {
  const raw = fs.readFileSync(secretsPath, 'utf8');
  secrets = JSON.parse(raw);
} catch (err) {
  console.error('[MCP] Invalid JSON in .cursor/mcp-secrets.json:', err.message);
  process.exit(1);
}

const env = { ...process.env, ...secrets };

const child = spawn(
  'docker',
  [
    'run',
    '-i',
    '--rm',
    '-e',
    'GITHUB_PERSONAL_ACCESS_TOKEN',
    'ghcr.io/github/github-mcp-server',
  ],
  {
    stdio: 'inherit',
    env,
  }
);

child.on('error', (err) => {
  console.error('[MCP] Failed to start docker:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
