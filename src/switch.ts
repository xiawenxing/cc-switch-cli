import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { spawn, execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { CliConfig } from './types.js';
import { info, success, warn, die } from './colors.js';
import {
  git, gitSilent, gitPassthrough,
  currentBranch, branchExists, listBranches, hasChanges,
  isGitRepo, isCcSwitchRunning,
} from './git.js';

// --- Gitignore templates ---

const CLAUDE_GITIGNORE = `.gitignore
!.gitignore
!.credentials.json
!settings.json
`;

const CODEX_GITIGNORE = `.gitignore
!.gitignore
!auth.json
!config.toml
`;

function writeGitignore(config: CliConfig): void {
  const content = config.name === 'claude' ? CLAUDE_GITIGNORE : CODEX_GITIGNORE;
  writeFileSync(join(config.dir, '.gitignore'), content);
}

// --- cc-switch proxy management ---

const CC_SWITCH_PATHS = [
  '/usr/bin/cc-switch',
  '/usr/local/bin/cc-switch',
  join(homedir(), '.local/bin/cc-switch'),
  join(homedir(), '.cargo/bin/cc-switch'),
];

function findCcSwitch(): string | null {
  for (const p of CC_SWITCH_PATHS) {
    try {
      if (existsSync(p) && statSync(p).mode & 0o111) return p;
    } catch { /* skip */ }
  }
  return null;
}

function startCcSwitch(): void {
  const bin = findCcSwitch();
  if (!bin) { warn('cc-switch not found'); return; }
  if (isCcSwitchRunning()) { info('cc-switch running'); return; }
  info('Starting cc-switch...');
  const child = spawn(bin, [], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  child.unref();
  // give it a moment to start
  execSync('sleep 1');
  if (isCcSwitchRunning()) {
    success('cc-switch started');
  } else {
    warn('cc-switch failed to start');
  }
}

function stopCcSwitch(): void {
  if (!isCcSwitchRunning()) { info('cc-switch not running'); return; }
  info('Stopping cc-switch...');
  try { execSync('pkill -f "cc-switch"', { stdio: 'pipe' }); } catch { /* ok */ }
  execSync('sleep 1');
  if (isCcSwitchRunning()) {
    try { execSync('pkill -9 -f "cc-switch"', { stdio: 'pipe' }); } catch { /* ok */ }
  }
  success('cc-switch stopped');
}

// --- Auth status ---

function getAuthStatus(config: CliConfig): string {
  const credPath = join(config.dir, config.credentialsFile);
  try {
    const stat = statSync(credPath);
    if (stat.size === 0) return 'NOT_LOGGED_IN';
    const content = readFileSync(credPath, 'utf8');
    if (config.name === 'claude') {
      const m = content.match(/"subscriptionType"\s*:\s*"([^"]*)"/);
      return m?.[1] ?? 'NOT_LOGGED_IN';
    } else {
      const m = content.match(/"auth_mode"\s*:\s*"([^"]*)"/);
      return m?.[1] ?? 'NOT_LOGGED_IN';
    }
  } catch {
    return 'NOT_LOGGED_IN';
  }
}

// --- Confirmation prompt ---

function confirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(/^[Yy]$/.test(answer.trim()));
    });
  });
}

// --- Commands ---

export function cmdInit(config: CliConfig): void {
  if (!existsSync(config.dir)) die(`${config.displayName} dir not found: ${config.dir}`);
  if (isGitRepo(config.dir)) { info(`${config.displayName} git repo exists`); return; }

  info(`Initializing ${config.displayName} git repo...`);
  git(config.dir, 'init', '-q');
  git(config.dir, 'config', 'user.email', 'switch@local');
  git(config.dir, 'config', 'user.name', 'Switch');
  writeGitignore(config);
  git(config.dir, 'add', '-A');
  git(config.dir, 'commit', '-q', '-m', 'init: official account');
  gitSilent(config.dir, 'branch', '-M', 'official');
  success('Initialized, current: official');
}

export function cmdSave(config: CliConfig): void {
  if (!hasChanges(config.dir)) {
    info(`No changes (${currentBranch(config.dir)})`);
    return;
  }
  git(config.dir, 'add', '-A');
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  git(config.dir, 'commit', '-q', '-m', `auto-save: ${now}`);
  success(`Saved to ${currentBranch(config.dir)}`);
}

export function cmdSwitch(config: CliConfig, target: string): void {
  if (!target) die('Usage: cc-switch <cli> switch <name>');
  if (!existsSync(config.dir)) die(`${config.displayName} dir not found: ${config.dir}`);

  const cur = currentBranch(config.dir);
  if (cur === target) { info(`Already on ${target}`); return; }

  // auto-save before switching
  try { cmdSave(config); } catch { /* ok */ }

  if (branchExists(config.dir, target)) {
    git(config.dir, 'checkout', '-q', target);
  } else {
    info(`Account ${target} not found, creating...`);
    git(config.dir, 'checkout', '-q', '-b', target);
    const credPath = join(config.dir, config.credentialsFile);
    try { unlinkSync(credPath); } catch { /* ok */ }
    git(config.dir, 'add', '-A');
    gitSilent(config.dir, 'commit', '-q', '-m', `init: ${target} account`);
  }

  success(`Switched to ${target}`);

  // cc-switch proxy management (both Claude and Codex use the same proxy)
  if (target === 'proxy') startCcSwitch();
  if (cur === 'proxy') stopCcSwitch();

  console.log(getAuthStatus(config));
}

export function cmdStatus(config: CliConfig): void {
  if (!existsSync(config.dir)) die(`${config.displayName} dir not found: ${config.dir}`);

  const cur = currentBranch(config.dir);
  const branches = listBranches(config.dir);

  console.log();
  console.log(`=== ${config.displayName} Switch v1.0.0 ===`);
  console.log();
  console.log(`Current account: ${cur}`);
  console.log();
  console.log('Available accounts:');
  for (const b of branches) {
    console.log(b === cur ? `  * ${b}` : `    ${b}`);
  }
  console.log();
  if (hasChanges(config.dir)) {
    warn('Unstaged changes');
  } else {
    success('Clean');
  }
  console.log();
}

export function cmdList(config: CliConfig): void {
  if (!existsSync(config.dir)) die(`${config.displayName} dir not found: ${config.dir}`);

  const cur = currentBranch(config.dir);
  const branches = listBranches(config.dir);
  for (const b of branches) {
    console.log(b === cur ? `  * ${b} (current)` : `    ${b}`);
  }
}

export async function cmdDelete(config: CliConfig, target: string): Promise<void> {
  if (!target) die('Usage: cc-switch <cli> delete <name>');
  if (!existsSync(config.dir)) die(`${config.displayName} dir not found: ${config.dir}`);

  const cur = currentBranch(config.dir);
  if (target === cur) die('Cannot delete current account');
  if (!branchExists(config.dir, target)) die(`Account not found: ${target}`);

  warn(`Deleting account: ${target}`);
  const ok = await confirm('Confirm? [y/N] ');
  if (!ok) { info('Cancelled'); return; }

  git(config.dir, 'branch', '-D', target, '-q');
  success(`Deleted: ${target}`);
}

export function cmdLog(config: CliConfig): void {
  if (!existsSync(config.dir)) die(`${config.displayName} dir not found: ${config.dir}`);
  gitPassthrough(config.dir, 'log', '--oneline', '--decorate', '--graph', '--all', '-20');
}
