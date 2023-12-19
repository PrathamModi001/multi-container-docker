# Build Phase
FROM node:16-alpine as builder
WORKDIR "/app"
COPY package.json .
RUN npm install
COPY . .
RUN npm run build


# Run Phase
FROM nginx
EXPOSE 3000
# copy the default.conf of local machine to the nginx container 
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html