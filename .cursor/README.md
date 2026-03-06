# Cursor MCP configuration

## Default repo (your fork)

`.cursor/mcp-defaults.json` sets the default GitHub repo for MCP tools (e.g. list issues, read issue). It’s set to **zzisaacson/documenso** so “my fork” or default repo means your fork. You can change `defaultOwner` / `defaultRepo` there if needed.

## Secrets (GitHub MCP and others)

Secrets are **not** committed. To use the GitHub MCP (or any server that reads from the secrets file):

1. Copy the example file and add your keys:
   ```bash
   cp .cursor/mcp-secrets.example.json .cursor/mcp-secrets.json
   ```
2. Edit `.cursor/mcp-secrets.json` and replace placeholders with your real values (e.g. your GitHub PAT).
3. Restart the MCP server or Cursor.

`mcp-secrets.json` is in `.gitignore` and will never be committed.
