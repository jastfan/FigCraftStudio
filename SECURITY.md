# Security Policy

## Supported Versions

We provide security updates for the following versions of FigCraft Studio:

| Version | Supported          |
| ------- | ------------------ |
| 0.11.x  | :white_check_mark: |
| < 0.11  | :x:                |

## Reporting a Vulnerability

The FigCraft team takes security and user privacy seriously. Because FigCraft Studio operates with 100% offline capability and zero telemetry, vulnerabilities generally pertain to:
1. File format parsing bugs (e.g. malformed `.figcraft` zip archives or JSON desync).
2. Memory safety or bounds issues in native crates (`crates/geom`, `crates/render`, `crates/format`).
3. Local network security in `crates/collab-net` or MCP server.

If you believe you have found a security vulnerability:
- **Do not** report security vulnerabilities through public GitHub issues.
- Please email details of the vulnerability to `security@figcraft.local`.
- Include a description of the issue, steps to reproduce, and any sample `.figcraft` test files.
- We will acknowledge receipt of your vulnerability report within 48 hours and work with you on a resolution.
