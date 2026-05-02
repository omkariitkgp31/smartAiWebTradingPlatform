# Vercel Deployment Guide: Synthetic-Bull Frontend

Yes, it is absolutely possible and highly recommended to deploy the **Frontend-V0** project to Vercel. Vercel is the native platform for Next.js and will handle builds and edge delivery automatically.

## Deployment Steps

### 1. Import to Vercel
- Connect your GitHub repository to Vercel.
- **Root Directory**: Set this to `Frontend-V0`. Vercel will then ignore the other backend folders during the frontend build.
- **Framework Preset**: Vercel should auto-detect **Next.js**.

### 2. Environment Variables
In the Vercel Project Settings, add the following environment variables:

| Variable | Recommended Value | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://34.93.4.23:4000` | Points the frontend to the Go API Gateway on GCP. |
| `NEXT_PUBLIC_WS_URL` | `ws://34.93.4.23:4000/ws` | (If explicitly used) Points to the WebSocket Gateway. |

> [!IMPORTANT]
> Since the project uses `NEXT_PUBLIC_` prefixes, these variables will be baked into the client-side bundle at build time.

### 3. Build & Deploy
Click **Deploy**. Vercel will run `npm run build` and `npm run start` (via its serverless edge runtime).

---

## The "Mixed Content" Warning (HTTPS)

Because Vercel provides an **HTTPS** URL by default (e.g., `https://synthetic-bull.vercel.app`), your browser will block requests to an **HTTP** backend (like `http://34.93.4.23:4000`) for security.

### Recommended Fix: HTTPS for Backend
To make the deployment production-ready, you should wrap your GCP backend in SSL:
1.  **Domain**: Map a domain (e.g., `api.synthetic-bull.com`) to your GCP IP.
2.  **Reverse Proxy**: Install Nginx on your GCP VM.
3.  **SSL**: Use **Certbot** to get a free Let's Encrypt certificate for your API domain.
4.  **Update Env**: Set `NEXT_PUBLIC_API_URL` to `https://api.synthetic-bull.com`.

### Temporary Workaround (Dev Only)
If you just want to see it working on Vercel without setting up a domain:
- In your browser (Chrome/Edge), click the **Lock icon** next to the URL -> **Site Settings**.
- Find **"Insecure content"** and set it to **Allow**.
- *Note: This only works for your local browser; others will still see a broken site.*

---

## Advantages of Vercel for this Project
- **Zero Configuration**: No need to manage Nginx or Node processes.
- **Global Edge Network**: Fast load times for users regardless of region.
- **Preview Deployments**: Every pull request gets its own unique URL to test features before merging.
