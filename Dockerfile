FROM alpine:latest
RUN apk add --no-co-cache curl bash dotnet8-runtime
RUN curl -L -o /lampac.zip https://github.com/lampac/lampac/releases/latest/download/lampac.zip || true
WORKDIR /app
CMD ["dotnet", "Lampac.dll"]
