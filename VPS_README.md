# SullyOS VPS Notes

This file records the current personal VPS setup for SullyOS / Claude Code work.

## Server

- Provider: netcup
- Product: VPS 500 G12
- Location: Nuremberg, Germany
- OS seen on login: Debian GNU/Linux
- Public IPv4: `159.195.217.207`
- Main user: `amber`
- Root login: disabled after SSH key login was confirmed
- Password SSH login: disabled after SSH key login was confirmed

## Local SSH

On the Windows machine, SSH is configured with the alias:

```powershell
ssh sully
```

The SSH config entry is stored at:

```text
C:\Users\huiji\.ssh\config
```

Expected config:

```sshconfig
Host sully
    HostName 159.195.217.207
    User amber
    IdentityFile D:\ssh-keys\netcup-sullyos
```

The private key is local-only:

```text
D:\ssh-keys\netcup-sullyos
```

Do not paste or commit the private key contents anywhere.

## Security State

Firewall status after setup:

```text
OpenSSH      ALLOW       Anywhere
OpenSSH (v6) ALLOW       Anywhere (v6)
```

SSH hardening applied in `/etc/ssh/sshd_config`:

```sshconfig
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

After editing SSH config, the connection was tested from a new terminal with:

```powershell
ssh sully
```

## Installed Runtime

Installed on the VPS:

- Node.js: `v22.23.1`
- npm: `10.9.8`
- pnpm: `11.17.0`
- PM2: `7.0.3`
- Claude Code: `2.1.220`

PM2 is installed, but no long-running app has been added yet.

## Working Directory

Main app workspace on the VPS:

```text
/home/amber/apps
```

Claude Code was tested in this folder and replied that it was running in:

```text
/home/amber/apps
```

## Claude Code

Start Claude Code on the VPS:

```bash
cd ~/apps
claude
```

The first login was completed using the Claude account subscription flow.

Do not share:

- Claude session links
- OAuth codes
- login tokens
- API keys

## netcup Contract Notes

- Billing period: every 12 months
- Contract period: at least 12 months
- Cancellation date shown in CCP: `27.07.2027`
- Cancellation should be "at end of contract period", not immediate withdrawal.

Avoid using "right of withdrawal" unless the goal is to cancel immediately.

## Current Architecture Intention

This VPS is intended as a clean long-running execution point for:

- Claude Code / CC work
- SullyOS API proxy or bridge
- offline / away-mode worker
- future headless browser tasks

SullyOS remains local-first for now. The VPS should not be treated as the source of truth for local memories unless an explicit sync system is added later.

## Do Not Store Here

Do not write the following into this README:

- root password
- SSH private key content
- netcup password
- 2FA recovery codes
- OpenAI / Claude / Fish / Tencent / Xfyun API keys
- full `.env` contents
- bank or payment details

