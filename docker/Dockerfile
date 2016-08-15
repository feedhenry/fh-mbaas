FROM registry.access.redhat.com/rhscl/nodejs-4-rhel7

EXPOSE 8080

USER root

RUN mkdir -p /var/feedhenry/data  && \
    mkdir -p /var/feedhenry/upload && \
    chmod -R 755 /var/feedhenry && \
    ln -sf /usr/share/zoneinfo/UTC /etc/localtime && \
    mkdir -p config && \
    chown -R default:root ./

USER default

# Extract app to work dir and copy conf
COPY fh-*.tar.gz ./
RUN tar -xf fh-*.tar.gz --strip 1 && \
            rm fh-*.tar.gz && \
            mv conf-docker.json config/conf.json && \
            chmod -R ug+rw ./

CMD ["bash", "-c", "node fh-mbaas.js config/conf.json --master-only"]
