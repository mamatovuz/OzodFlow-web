
# OzodFlow-web

OzodFlow landing site and admin dashboard.

## Vercel admin data

Admin paneldagi o'zgarishlar hamma qurilmada ko'rinishi uchun Vercel project settings ichida Environment Variables qo'shing:

- `OZODFLOW_GITHUB_TOKEN` - GitHub Personal Access Token, repository contents read/write ruxsati bilan.
- `OZODFLOW_ADMIN_PASSWORD` - admin panel paroli.
- `GITHUB_OWNER` - `mamatovuz`.
- `GITHUB_REPO` - `OzodFlow-web`.
- `GITHUB_BRANCH` - `main`.

API `server/data/site-data.json` faylini GitHub orqali o'qiydi va admin saqlaganda shu faylni yangilaydi.
