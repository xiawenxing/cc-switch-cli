import { homedir } from 'node:os';
import { join } from 'node:path';

export type CliName = 'claude' | 'codex';

export interface CliConfig {
  name: CliName;
  displayName: string;
  dir: string;
  credentialsFile: string;
}

const CLI_CONFIGS: Record<CliName, Omit<CliConfig, 'dir'> & { dirName: string }> = {
  claude: {
    name: 'claude',
    displayName: 'Claude',
    dirName: '.claude',
    credentialsFile: '.credentials.json',
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    dirName: '.codex',
    credentialsFile: 'auth.json',
  },
};

export function getCliConfig(name: CliName): CliConfig {
  const c = CLI_CONFIGS[name];
  return {
    name: c.name,
    displayName: c.displayName,
    dir: join(homedir(), c.dirName),
    credentialsFile: c.credentialsFile,
  };
}
