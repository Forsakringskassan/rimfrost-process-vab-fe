# LOCAL TESTING ONLY — mirrors the Dockerfile generated inline by the CI workflow.
# Run `npm run build` first to populate dist/, then `docker build .` to test locally.
# The authoritative build is defined in .github/workflows/.

# Serve with Apache HTTP Server and inject runtime environment variables
FROM httpd:latest

USER 0

# Clean web root
RUN rm -rf /usr/local/apache2/htdocs/*

# Copy built app from dist/
COPY dist/ /usr/local/apache2/htdocs/

# Pass version info and image name as build args
ARG NEXT_VERSION
ARG GIT_COMMIT
ARG IMAGE_NAME
ARG BUILD_DATE
ENV NEXT_VERSION=$NEXT_VERSION
ENV GIT_COMMIT=$GIT_COMMIT
ENV IMAGE_NAME=$IMAGE_NAME
ENV BUILD_DATE=$BUILD_DATE

# Set default port
ENV HTTPD_PORT=8080

# Create writable directories and set permissions for OpenShift/CRC
RUN mkdir -p /tmp/apache2/logs /tmp/apache2/run && \
    chown -R www-data:www-data /usr/local/apache2/htdocs /tmp/apache2 && \
    chmod -R 755 /usr/local/apache2/htdocs && \
    chmod -R 777 /tmp/apache2

# Create startup script that configures httpd with dynamic port and proper permissions
RUN echo '#!/bin/bash' > /usr/local/bin/start-httpd.sh && \
    echo 'PORT=${HTTPD_PORT:-8080}' >> /usr/local/bin/start-httpd.sh && \
    echo 'cp /usr/local/apache2/conf/httpd.conf /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    echo 'sed -i "s/Listen 80/Listen $PORT/" /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    echo 'sed -i "s|ErrorLog logs/error_log|ErrorLog /tmp/apache2/logs/error_log|" /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    echo 'sed -i "s|CustomLog logs/access_log|CustomLog /tmp/apache2/logs/access_log|" /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    echo 'sed -i "s|#PidFile logs/httpd.pid|PidFile /tmp/apache2/run/httpd.pid|" /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    echo 'echo "PidFile /tmp/apache2/run/httpd.pid" >> /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    echo 'echo "ServerName localhost" >> /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    echo '# ADDED: Enable mod_headers so Apache can set response headers' >> /usr/local/bin/start-httpd.sh && \
    echo 'sed -i "s/#LoadModule headers_module/LoadModule headers_module/" /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    echo '# ADDED: Allow cross-origin requests so the portal can load remoteEntry.js via Module Federation' >> /usr/local/bin/start-httpd.sh && \
    echo 'echo "Header set Access-Control-Allow-Origin \"*\"" >> /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    echo 'echo "Starting container: $IMAGE_NAME — Version: $NEXT_VERSION — Port: $PORT"' >> /usr/local/bin/start-httpd.sh && \
    echo 'httpd -D FOREGROUND -f /tmp/httpd.conf' >> /usr/local/bin/start-httpd.sh && \
    chmod +x /usr/local/bin/start-httpd.sh

# Switch to www-data user for security
USER www-data

# Expose the configurable port
EXPOSE $HTTPD_PORT

# Use the startup script
CMD ["/usr/local/bin/start-httpd.sh"]
