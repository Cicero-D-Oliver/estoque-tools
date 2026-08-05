FROM maven:3.9.11-eclipse-temurin-17-alpine AS build
WORKDIR /workspace

COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline

COPY src ./src
RUN mvn -B -ntp clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S estoque && adduser -S estoque -G estoque
COPY --from=build --chown=estoque:estoque /workspace/target/estoque-*.jar /app/estoque.jar

USER estoque
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/estoque.jar"]
