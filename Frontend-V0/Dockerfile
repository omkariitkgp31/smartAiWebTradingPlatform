# ---- deps stage ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps

# ---- builder stage ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Allow the API URL to be injected at build time
ARG NEXT_PUBLIC_API_URL=http://api:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ---- runner stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Don't copy node_modules from builder if we want a clean production start, 
# but Next.js usually needs them in standalone or regular mode.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "start"]
