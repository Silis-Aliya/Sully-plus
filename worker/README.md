# SullyOS Main Proxy Worker

This is the main proxy Worker used by SullyOS for search, backup helpers, Notion/Feishu/XHS helpers, and voice enhancement endpoints.

## Deploy

From the repo root:

```bash
pnpm deploy:main-worker
```

Or from this directory:

```bash
wrangler deploy
```

## Private Secrets

Do not put Tencent Cloud or XFYUN secrets in frontend settings, localStorage, or committed files. Add them in Cloudflare:

```text
Workers & Pages -> sullyos-main-proxy -> Settings -> Variables -> Add variable
```

Required for Tencent speaker verification:

```text
TENCENT_SECRET_ID
TENCENT_SECRET_KEY
```

Required for XFYUN voice profile:

```text
XFYUN_API_KEY
XFYUN_API_SECRET
```

Optional:

```text
TENCENT_ASR_REGION=ap-guangzhou
TENCENT_VOICE_PRINT_ID
TENCENT_VOICE_GROUP_ID
XFYUN_APP_ID
```

## Voice Endpoints

The frontend calls these through the configured main Worker URL:

```text
POST /voice/tencent/enroll
POST /voice/tencent/verify
POST /voice/xfyun/profile
```

SullyOS frontend only stores user-side IDs such as `VoicePrintId` and `APPID`. Provider secrets stay in Cloudflare Worker variables.
