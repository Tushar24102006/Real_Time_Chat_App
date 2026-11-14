FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/chatapp-1.0.0-SNAPSHOT.jar app.jar
RUN mkdir -p uploads
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]

