# cc-switch-cli

Git-branch-based account switcher for Claude CLI and Codex CLI.

Each CLI's config directory (`~/.claude/` or `~/.codex/`) is managed as a git repo where each branch represents a different account's credentials and settings. Switching accounts = checking out a different git branch.

## Install

```bash
npm install -g cc-switch-cli
```

Requires Node.js >= 18 and git.

## Commands

| Command | Alias | Description |
|---|---|---|
| `init` | | Initialize git repo in config directory |
| `status` | `st` | Show current account and status |
| `list` | `ls` | List all accounts |
| `switch <name>` | `sw` | Switch account (creates if not exists) |
| `save` | | Save current state |
| `delete <name>` | `rm` | Delete an account |
| `log` | | Show git commit history |
| `help` | | Show help |

## Usage

Three bin commands are provided:

- `cc-switch` — main command, specify CLI as first argument
- `claude-switch` — shortcut for `cc-switch claude`
- `codex-switch` — shortcut for `cc-switch codex`

```bash
# Initialize
cc-switch claude init
cc-switch codex init

# Switch accounts
cc-switch claude sw proxy
cc-switch claude sw official
claude-switch sw proxy

# List accounts
claude-switch ls
codex-switch ls

# Check status
cc-switch claude st
cc-switch codex status

# View history
claude-switch log

# Delete an account
cc-switch claude rm old-account
```

Backward compatible with `--claude` / `--codex` flag syntax:

```bash
cc-switch --claude sw proxy
```

## Claude Proxy

When switching to the `proxy` account on Claude CLI, the `cc-switch` proxy binary is automatically started. When switching away from `proxy`, it is automatically stopped. The proxy listens on `127.0.0.1:15721` and manages API authentication.

## How It Works

- `init` creates a git repo inside the CLI config directory, commits current credentials as the `official` branch
- `switch` auto-saves the current branch, then checks out the target branch (or creates a new one with a clean credentials file)
- Only credentials and config files are tracked by git; caches, logs, and other data are shared across accounts

## License

MIT
