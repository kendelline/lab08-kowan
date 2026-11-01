FROM nginx:alpine

ENV FAASD_GATEWAY=http://52.54.0.92:8080

# Dokku git:sync builds from monorepo root.
COPY frontend/index.html frontend/style.css frontend/script.js /usr/share/nginx/html/
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
