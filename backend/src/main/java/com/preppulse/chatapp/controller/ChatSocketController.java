package com.preppulse.chatapp.controller;

import com.preppulse.chatapp.dto.ChatMessageRequest;
import com.preppulse.chatapp.entity.User;
import com.preppulse.chatapp.exception.UnauthorizedException;
import com.preppulse.chatapp.repository.UserRepository;
import com.preppulse.chatapp.security.UserPrincipal;
import com.preppulse.chatapp.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatSocketController {

    private final MessageService messageService;
    private final com.preppulse.chatapp.service.RoomService roomService;
    private final UserRepository userRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send/{roomId}")
    public void sendMessage(
            @DestinationVariable("roomId") Long roomId,
            @Payload @Valid ChatMessageRequest request,
            Principal principal
    ) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthenticated WebSocket session cannot send messages");
        }

        Long senderId = extractUserId(principal);
        log.debug("STOMP message received for room #{}, senderId: {}", roomId, senderId);

        messageService.saveAndBroadcastMessage(roomId, request, senderId);
    }

    @MessageMapping("/chat.seen/{roomId}")
    public void markRoomSeen(
            @DestinationVariable("roomId") Long roomId,
            Principal principal
    ) {
        if (principal == null) return;
        Long userId = extractUserId(principal);
        roomService.markRoomAsRead(roomId, userId);
    }

    @MessageMapping("/chat.typing/{roomId}")
    public void handleTyping(
            @DestinationVariable("roomId") Long roomId,
            @Payload java.util.Map<String, Object> payload,
            Principal principal
    ) {
        if (principal == null) return;
        Long userId = extractUserId(principal);
        String username = principal.getName();
        boolean isTyping = Boolean.TRUE.equals(payload.get("typing"));

        com.preppulse.chatapp.dto.TypingNotificationDto notification = com.preppulse.chatapp.dto.TypingNotificationDto.builder()
                .roomId(roomId)
                .userId(userId)
                .username(username)
                .typing(isTyping)
                .build();

        // Broadcast to /topic/room.{roomId}
        messagingTemplate.convertAndSend("/topic/room." + roomId, notification);
    }

    private Long extractUserId(Principal principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new UnauthorizedException("Authenticated student record not found"));
        return user.getId();
    }
}

