import { execSync, execFileSync } from 'node:child_process';

function run(dir: string, args: string[], throwOnError: boolean): string | null {
  try {
    const result = execFileSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trimEnd();
  } catch {
    if (throwOnError) throw new Error(`git ${args.join(' ')} failed in ${dir}`);
    return null;
  }
}

export function git(dir: string, ...args: string[]): string {
  return run(dir, args, true)!;
}

export function gitSilent(dir: string, ...args: string[]): string | null {
  return run(dir, args, false);
}

export function gitPassthrough(dir: string, ...args: string[]): void {
  try {
    execFileSync('git', ['-C', dir, ...args], { stdio: 'inherit' });
  } catch {
    // allow non-zero exit for display commands
  }
}

export function currentBranch(dir: string): string {
  return git(dir, 'branch', '--show-current');
}

export function branchExists(dir: string, name: string): boolean {
  return gitSilent(dir, 'show-ref', '--verify', '--quiet', `refs/heads/${name}`) !== null;
}

export function listBranches(dir: string): string[] {
  const out = git(dir, 'branch', '--format=%(refname:short)');
  return out.split('\n').filter(Boolean);
}

export function hasChanges(dir: string): boolean {
  const diffClean = gitSilent(dir, 'diff', '--quiet', 'HEAD') !== null
    ? false : true;
  // also check untracked files
  const untracked = git(dir, 'ls-files', '--others', '--exclude-standard');
  return diffClean || untracked.length > 0;
}

export function isGitRepo(dir: string): boolean {
  return gitSilent(dir, 'rev-parse', '--git-dir') !== null;
}

export function isCcSwitchRunning(): boolean {
  try {
    execSync('pgrep -f "cc-switch"', { stdio: 'pipe' });
    return true;
  } catch {
    try {
      execSync('pgrep -f "ccswitch"', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}
