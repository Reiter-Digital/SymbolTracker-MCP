FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build TypeScript code
RUN npm run build

# Make the application executable
RUN chmod +x dist/index.js

# Command to run the MCP server
CMD ["node", "dist/index.js"]
