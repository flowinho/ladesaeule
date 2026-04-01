FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 1337

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1337

CMD ["npm", "start"]
