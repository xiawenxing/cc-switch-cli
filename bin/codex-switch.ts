#!/usr/bin/env node
import { main } from '../src/cli.js';
main(['codex', ...process.argv.slice(2)]);
