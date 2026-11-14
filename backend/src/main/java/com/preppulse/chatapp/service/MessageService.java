package com.preppulse.chatapp.service;

import com.preppulse.chatapp.dto.ChatMessageRequest;
import com.preppulse.chatapp.dto.ChatMessageResponse;
import com.preppulse.chatapp.entity.ChatRoom;
import com.preppulse.chatapp.entity.Message;
import com.preppulse.chatapp.entity.MessageStatus;
import com.preppulse.chatapp.entity.MessageType;
import com.preppulse.chatapp.entity.User;
import com.preppulse.chatapp.exception.BadRequestException;
import com.preppulse.chatapp.exception.ResourceNotFoundException;
import com.preppulse.chatapp.exception.UnauthorizedException;
import com.preppulse.chatapp.repository.ChatRoomRepository;
import com.preppulse.chatapp.repository.MessageRepository;
import com.preppulse.chatapp.repository.RoomMemberRepository;
import com.preppulse.chatapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository roomRepository;
    private final RoomMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ChatMessageResponse saveAndBroadcastMessage(Long roomId, ChatMessageRequest request, Long senderId) {
        if (request.getContent() == null || request.getContent().trim().isEmpty()) {
            throw new BadRequestException("Message content cannot be blank");
        }

        if (request.getContent().length() > 2000) {
            throw new BadRequestException("Message content cannot exceed 2000 characters");
        }

        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));

        // Authorization check: Verify sender is a member of this room
        boolean isMember = memberRepository.existsByRoomIdAndUserId(roomId, senderId);
        if (!isMember) {
            log.warn("Unauthorized message attempt: User {} is not a member of room {}", senderId, roomId);
            throw new UnauthorizedException("You are not authorized to send messages to room #" + roomId);
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + senderId));

        Message message = Message.builder()
                .room(room)
                .sender(sender)
                .content(request.getContent().trim())
                .type(request.getType() != null ? request.getType() : MessageType.TEXT)
                .status(MessageStatus.SENT)
                .deleted(false)
                .build();

        Message savedMessage = messageRepository.save(message);

        ChatMessageResponse response = ChatMessageResponse.builder()
                .id(savedMessage.getId())
                .roomId(room.getId())
                .senderId(sender.getId())
                .senderUsername(sender.getUsername())
                .senderAvatarUrl(sender.getAvatarUrl())
                .content(savedMessage.getContent())
                .type(savedMessage.getType())
                .status(savedMessage.getStatus())
                .createdAt(savedMessage.getCreatedAt())
                .deleted(false)
                .clientMsgId(request.getClientMsgId())
                .build();

        // Broadcast to all subscribers of /topic/room.{roomId}
        String destination = "/topic/room." + roomId;
        messagingTemplate.convertAndSend(destination, response);
        log.info("Message #{} broadcasted to {} by @{}", savedMessage.getId(), destination, sender.getUsername());

        return response;
    }

    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getRoomMessages(Long roomId, Long requestingUserId, Pageable pageable) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Room not found with id: " + roomId);
        }

        boolean isMember = memberRepository.existsByRoomIdAndUserId(roomId, requestingUserId);
        if (!isMember) {
            throw new UnauthorizedException("You are not a member of room #" + roomId);
        }

        return messageRepository.findByRoomIdOrderByCreatedAtDesc(roomId, pageable)
                .map(msg -> ChatMessageResponse.builder()
                        .id(msg.getId())
                        .roomId(roomId)
                        .senderId(msg.getSender().getId())
                        .senderUsername(msg.getSender().getUsername())
                        .senderAvatarUrl(msg.getSender().getAvatarUrl())
                        .content(msg.isDeleted() ? "This message was deleted" : msg.getContent())
                        .type(msg.getType())
                        .status(msg.getStatus())
                        .createdAt(msg.getCreatedAt())
                        .deleted(msg.isDeleted())
                        .build());
    }

    @Transactional
    public void deleteMessage(Long roomId, Long messageId, Long requestingUserId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        if (!java.util.Objects.equals(message.getRoom().getId(), roomId)) {
            throw new BadRequestException("Message does not belong to room #" + roomId);
        }

        // Only sender or group ADMIN can delete
        boolean isSender = java.util.Objects.equals(message.getSender().getId(), requestingUserId);
        boolean isAdmin = memberRepository.findByRoomIdAndUserId(roomId, requestingUserId)
                .map(m -> m.getRole() == com.preppulse.chatapp.entity.MemberRole.ADMIN)
                .orElse(false);

        if (!isSender && !isAdmin) {
            throw new UnauthorizedException("You are not authorized to delete this message");
        }

        message.setDeleted(true);
        messageRepository.save(message);

        ChatMessageResponse deletedNotice = ChatMessageResponse.builder()
                .id(message.getId())
                .roomId(roomId)
                .senderId(message.getSender().getId())
                .senderUsername(message.getSender().getUsername())
                .content("This message was deleted")
                .type(message.getType())
                .status(message.getStatus())
                .createdAt(message.getCreatedAt())
                .deleted(true)
                .build();

        messagingTemplate.convertAndSend("/topic/room." + roomId, deletedNotice);
        log.info("Message #{} in room #{} marked as deleted by user ID: {}", messageId, roomId, requestingUserId);
    }

    @Transactional(readOnly = true)
    public java.util.List<ChatMessageResponse> searchMessages(Long roomId, String query, Long requestingUserId) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Room not found with id: " + roomId);
        }

        boolean isMember = memberRepository.existsByRoomIdAndUserId(roomId, requestingUserId);
        if (!isMember) {
            throw new UnauthorizedException("You are not a member of room #" + roomId);
        }

        if (query == null || query.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return messageRepository.searchRoomMessages(roomId, query.trim()).stream()
                .map(msg -> ChatMessageResponse.builder()
                        .id(msg.getId())
                        .roomId(roomId)
                        .senderId(msg.getSender().getId())
                        .senderUsername(msg.getSender().getUsername())
                        .senderAvatarUrl(msg.getSender().getAvatarUrl())
                        .content(msg.getContent())
                        .type(msg.getType())
                        .status(msg.getStatus())
                        .createdAt(msg.getCreatedAt())
                        .deleted(false)
                        .build())
                .toList();
    }
}

