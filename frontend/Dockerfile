FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose Vite default port
EXPOSE 5173

# Host 0.0.0.0 is required for Docker networking
CMD ["npm", "run", "dev", "--", "--host"]
