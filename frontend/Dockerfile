# Use a newer Node base image
FROM node:20-alpine

WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

COPY ./frontend/.npmrc ./
COPY ./frontend/package*.json ./

RUN npm install

COPY ./frontend ./

CMD ["npm", "start"]
