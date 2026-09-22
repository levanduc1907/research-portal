FROM mysql:8.4

LABEL maintainer="UIUC Research Portal Team"
LABEL description="Custom MySQL 8.4 database container for UIUC Research Portal"

# Default environment variables for standalone `docker run`
ENV MYSQL_ROOT_PASSWORD=root_password
ENV MYSQL_DATABASE=uiuc_research
ENV MYSQL_USER=uiuc_user
ENV MYSQL_PASSWORD=uiuc_password

# Copy custom configuration
COPY my.cnf /etc/mysql/conf.d/my.cnf
RUN chmod 644 /etc/mysql/conf.d/my.cnf

# Copy initialization scripts
COPY init/ /docker-entrypoint-initdb.d/
RUN chmod -R 755 /docker-entrypoint-initdb.d/

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD mysqladmin ping -h 127.0.0.1 -u uiuc_user --password=uiuc_password || exit 1

EXPOSE 3306
