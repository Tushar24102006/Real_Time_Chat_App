package com.preppulse.chatapp.service;

import com.preppulse.chatapp.dto.ChatMessageRequest;
import com.preppulse.chatapp.dto.ChatMessageResponse;
import com.preppulse.chatapp.entity.*;
import com.preppulse.chatapp.exception.BadRequestException;
import com.preppulse.chatapp.exception.UnauthorizedException;
import com.preppulse.chatapp.repository.ChatRoomRepository;
import com.preppulse.chatapp.repository.MessageRepository;
import com.preppulse.chatapp.repository.RoomMemberRepository;
import com.preppulse.chatapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ChatRoomRepository roomRepository;

    @Mock
    private RoomMemberRepository memberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private MessageService messageService;

    private User sender;
    private ChatRoom room;
    private Message message;

    @BeforeEach
    void setUp() {
        sender = User.builder()
                .id(1L)
                .username("aarav_sharma")
                .email("aarav@campus.edu")
                .build();

        room = ChatRoom.builder()
                .id(10L)
                .name("DSA Grind")
                .type(RoomType.GROUP)
                .build();

        message = Message.builder()
                .id(100L)
                .room(room)
                .sender(sender)
                .content("Practicing dynamic programming on intervals.")
                .type(MessageType.TEXT)
                .status(MessageStatus.SENT)
                .createdAt(Instant.now())
                .deleted(false)
                .build();
    }

    @Test
    @DisplayName("Should successfully persist message and broadcast to /topic/room.{roomId}")
    void saveAndBroadcastMessage_Success() {
        ChatMessageRequest request = ChatMessageRequest.builder()
                .content("Practicing dynamic programming on intervals.")
                .type(MessageType.TEXT)
                .clientMsgId("client-uuid-12345")
                .build();

        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(memberRepository.existsByRoomIdAndUserId(10L, 1L)).thenReturn(true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(messageRepository.save(any(Message.class))).thenReturn(message);

        ChatMessageResponse response = messageService.saveAndBroadcastMessage(10L, request, 1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getContent()).isEqualTo("Practicing dynamic programming on intervals.");
        assertThat(response.getSenderUsername()).isEqualTo("aarav_sharma");
        assertThat(response.getClientMsgId()).isEqualTo("client-uuid-12345");

        verify(messageRepository).save(any(Message.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/room.10"), any(ChatMessageResponse.class));
    }

    @Test
    @DisplayName("Should reject blank message content with BadRequestException")
    void saveAndBroadcastMessage_BlankContent_ThrowsBadRequest() {
        ChatMessageRequest request = ChatMessageRequest.builder()
                .content("   ")
                .build();

        assertThatThrownBy(() -> messageService.saveAndBroadcastMessage(10L, request, 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot be blank");

        verify(messageRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Should reject message exceeding 2000 chars with BadRequestException")
    void saveAndBroadcastMessage_ExceedsLength_ThrowsBadRequest() {
        ChatMessageRequest request = ChatMessageRequest.builder()
                .content("a".repeat(2001))
                .build();

        assertThatThrownBy(() -> messageService.saveAndBroadcastMessage(10L, request, 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot exceed 2000 characters");

        verify(messageRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject non-member sender with UnauthorizedException")
    void saveAndBroadcastMessage_NotMember_ThrowsUnauthorized() {
        ChatMessageRequest request = ChatMessageRequest.builder()
                .content("Hello everyone!")
                .build();

        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(memberRepository.existsByRoomIdAndUserId(10L, 1L)).thenReturn(false);

        assertThatThrownBy(() -> messageService.saveAndBroadcastMessage(10L, request, 1L))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("not authorized to send messages to room #10");

        verify(messageRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Should return paginated room messages for authorized member")
    void getRoomMessages_Success() {
        PageRequest pageRequest = PageRequest.of(0, 20);
        when(roomRepository.existsById(10L)).thenReturn(true);
        when(memberRepository.existsByRoomIdAndUserId(10L, 1L)).thenReturn(true);
        when(messageRepository.findByRoomIdOrderByCreatedAtDesc(10L, pageRequest))
                .thenReturn(new PageImpl<>(List.of(message), pageRequest, 1));

        Page<ChatMessageResponse> result = messageService.getRoomMessages(10L, 1L, pageRequest);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getContent()).isEqualTo("Practicing dynamic programming on intervals.");
    }

    @Test
    @DisplayName("Should reject fetching messages if requester is not a room member")
    void getRoomMessages_NotMember_ThrowsUnauthorized() {
        PageRequest pageRequest = PageRequest.of(0, 20);
        when(roomRepository.existsById(10L)).thenReturn(true);
        when(memberRepository.existsByRoomIdAndUserId(10L, 1L)).thenReturn(false);

        assertThatThrownBy(() -> messageService.getRoomMessages(10L, 1L, pageRequest))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("You are not a member of room #10");
    }
}

