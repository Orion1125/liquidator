FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .
RUN npm run build

USER node
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
