# Deployment

```bash
npm install
npm run build
```

Publish the generated `dist/` directory. There are no environment variables.

- Cloudflare Pages: build command `npm run build`, output `dist`.
- Vercel: framework preset Vite, build command `npm run build`, output `dist`.
- GitHub Pages: publish `dist`; Vite uses a relative base so assets work below a repository path. Ensure direct requests route to `index.html` if adding client-side routes.

Templates and fonts are static assets. A working application requires no external service after deployment.
