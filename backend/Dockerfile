FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY . .
RUN npm install --legacy-peer-deps
RUN npx prisma generate
RUN npm run build
CMD ["npm", "run", "start:prod"]