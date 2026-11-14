package com.preppulse.chatapp.config;

import com.preppulse.chatapp.security.WebSocketAuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SockJS fallback endpoint
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Standard pure WebSocket endpoint
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Message broker for subscriptions: /topic for room broadcasts, /queue for 1-1 / user notifications
        registry.enableSimpleBroker("/topic", "/queue");

        // Application destination prefix for client send commands: e.g. /app/chat.send/{roomId}
        registry.setApplicationDestinationPrefixes("/app");

        // User destination prefix for private user notifications: e.g. /user/queue/notifications
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Intercept STOMP CONNECT to validate JWT & assign authenticated Principal
        registration.interceptors(webSocketAuthInterceptor);
    }
}

