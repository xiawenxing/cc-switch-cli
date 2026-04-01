import type { CliName } from './types.js';
import { getCliConfig } from './types.js';
import { die } from './colors.js';
import {
  cmdInit, cmdSave, cmdSwitch, cmdStatus,
  cmdList, cmdDelete, cmdLog,
} from './switch.js';

const VERSION = '1.0.0';

function printHelp(): void {
  console.log(`cc-switch v${VERSION} - CLI account switcher

Usage:
    cc-switch <cli> <command> [args]
    claude-switch <command> [args]
    codex-switch <command> [args]

CLIs:
    claude      Claude CLI
    codex       Codex CLI

Commands:
    init                Initialize
    status  (st)        Show status
    list    (ls)        List accounts
    switch  (sw) <name> Switch account
    save                Save current state
    delete  (rm) <name> Delete account
    log                 Show git log
    help                Show help

Examples:
    cc-switch claude init
    cc-switch claude sw proxy
    claude-switch sw official
    codex-switch ls`);
}

function parseCliName(arg: string): CliName | null {
  const name = arg.replace(/^--/, '');
  if (name === 'claude' || name === 'codex') return name;
  return null;
}

type CommandAlias = string;
const COMMAND_MAP: Record<CommandAlias, string> = {
  st: 'status',
  sw: 'switch',
  ls: 'list',
  rm: 'delete',
};

function resolveCommand(cmd: string): string {
  return COMMAND_MAP[cmd] ?? cmd;
}

export async function main(args: string[]): Promise<void> {
  const first = args[0];

  if (!first || first === 'help' || first === '--help' || first === '-h') {
    printHelp();
    return;
  }
  if (first === '-v' || first === '--version') {
    console.log(`cc-switch v${VERSION}`);
    return;
  }

  const cliName = parseCliName(first);
  if (!cliName) die(`Unknown CLI: ${first}`);

  const config = getCliConfig(cliName);
  const cmd = resolveCommand(args[1] ?? 'help');
  const rest = args.slice(2);

  switch (cmd) {
    case 'init':   cmdInit(config); break;
    case 'status': cmdStatus(config); break;
    case 'list':   cmdList(config); break;
    case 'switch': cmdSwitch(config, rest[0] ?? ''); break;
    case 'save':   cmdSave(config); break;
    case 'delete': await cmdDelete(config, rest[0] ?? ''); break;
    case 'log':    cmdLog(config); break;
    case 'help':
    case '--help':
    case '-h':     printHelp(); break;
    default:       die(`Unknown command: ${cmd}`);
  }
}
