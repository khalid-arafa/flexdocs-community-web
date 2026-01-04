# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
# COPY ./src/package*.json ./
COPY . .
RUN npm install

# Copy project files

# Expose the port Next.js will run on
# EXPOSE 3000


# Start the app
CMD ["npm", "run", "dev"]

# RUN npm run build
# CMD ["npm", "run", "start"]
