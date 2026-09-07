FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine

RUN apk add --no-cache curl bash unzip

WORKDIR /app

RUN curl -L -o /app/lampac.zip https://github.com/lampac/lampac/releases/latest/download/lampac.zip \
    && unzip /app/lampac.zip -d /app \
    && rm /app/lampac.zip

ENV PORT=7000
EXPOSE 7000

CMD ["dotnet", "Lampac.dll"]

