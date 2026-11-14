package com.preppulse.chatapp.listener;

import com.preppulse.chatapp.entity.User;
import com.preppulse.chatapp.repository.UserRepository;
import com.preppulse.chatapp.security.UserPrincipal;
import com.preppulse.chatapp.service.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final PresenceService presenceService;
    private final UserRepository userRepository;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();

        if (principal != null) {
            UserInfo userInfo = resolveUserInfo(principal);
            if (userInfo != null) {
                log.info("WebSocket Session Connected: user @{} (ID: {})", userInfo.username, userInfo.userId);
                presenceService.userConnected(userInfo.userId, userInfo.username);
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();

        if (principal != null) {
            UserInfo userInfo = resolveUserInfo(principal);
            if (userInfo != null) {
                log.info("WebSocket Session Disconnected: user @{} (ID: {})", userInfo.username, userInfo.userId);
                presenceService.userDisconnected(userInfo.userId, userInfo.username);
            }
        }
    }

    private UserInfo resolveUserInfo(Principal principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return new UserInfo(userPrincipal.getId(), userPrincipal.getUsername());
        }

        // Fallback: lookup by username
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .map(u -> new UserInfo(u.getId(), u.getUsername()))
                .orElse(null);
    }

    private record UserInfo(Long userId, String username) {}
}

