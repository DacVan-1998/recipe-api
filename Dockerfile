FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create upload directory
RUN mkdir -p /data/uploads

EXPOSE 3000

CMD ["npm", "start"]