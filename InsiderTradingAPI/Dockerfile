# ----- Base runtime image -----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
# Listen on HTTP 8080 explicitly (we're not configuring HTTPS here)
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# ----- Build image -----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["InsiderTradingAPI.csproj", "./"]
RUN dotnet restore "InsiderTradingAPI.csproj"
COPY . .
RUN dotnet build "InsiderTradingAPI.csproj" -c Release -o /app/build

# ----- Publish image -----
FROM build AS publish
RUN dotnet publish "InsiderTradingAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ----- Final image -----
FROM base AS final
WORKDIR /app

# App binaries
COPY --from=publish /app/publish .

# Copy the SQLite database from the repo into the image.
# The aspnet:8.0 image runs as a non-root 'app' user, so give it ownership.
# If your host Docker version supports --chown, this ensures write access.
COPY --chown=app:app ./data /app/data
# If your Docker doesn't support --chown, uncomment the next two lines:
# USER root
# RUN mkdir -p /app/data && cp -r /app/data /app/data && chown -R app:app /app/data && chmod -R 755 /app/data && true && :
# USER app

ENTRYPOINT ["dotnet", "InsiderTradingAPI.dll"]
