FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    wget \
    ca-certificates \
    libicu70 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN curl -L -o lampac.zip https://github.com/lampac/lampac/releases/latest/download/lampac.zip \
    && unzip lampac.zip -d /app \
    && rm lampac.zip

EXPOSE 7000

CMD ["./Lampac"]


