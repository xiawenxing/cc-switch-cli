import pc from 'picocolors';

export function info(msg: string): void {
  console.log(`${pc.blue('i')}  ${msg}`);
}

export function success(msg: string): void {
  console.log(`${pc.green('OK')} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${pc.yellow('!')}  ${msg}`);
}

export function die(msg: string): never {
  console.error(`\n${pc.red('ERROR')} ${msg}\n`);
  process.exit(1);
}
