package com.preppulse.chatapp.service;

import com.preppulse.chatapp.dto.AddMemberRequest;
import com.preppulse.chatapp.dto.CreateGroupRequest;
import com.preppulse.chatapp.dto.RoomResponse;
import com.preppulse.chatapp.entity.*;
import com.preppulse.chatapp.exception.BadRequestException;
import com.preppulse.chatapp.exception.UnauthorizedException;
import com.preppulse.chatapp.mapper.RoomMapper;
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

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private ChatRoomRepository roomRepository;

    @Mock
    private RoomMemberRepository memberRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoomMapper roomMapper;

    @InjectMocks
    private RoomService roomService;

    private User aarav;
    private User priya;
    private ChatRoom sampleGroup;
    private ChatRoom samplePrivate;

    @BeforeEach
    void setUp() {
        aarav = User.builder().id(1L).username("aarav_sharma").email("aarav@campus.edu").build();
        priya = User.builder().id(2L).username("priya_patel").email("priya@campus.edu").build();

        sampleGroup = ChatRoom.builder()
                .id(10L)
                .name("DSA Grind")
                .type(RoomType.GROUP)
                .createdBy(aarav)
                .createdAt(Instant.now())
                .members(new ArrayList<>())
                .build();

        RoomMember adminMember = RoomMember.builder().id(101L).room(sampleGroup).user(aarav).role(MemberRole.ADMIN).build();
        sampleGroup.getMembers().add(adminMember);

        samplePrivate = ChatRoom.builder()
                .id(20L)
                .type(RoomType.PRIVATE)
                .createdBy(aarav)
                .createdAt(Instant.now())
                .members(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Should create group with creator as ADMIN")
    void createGroup_Success() {
        CreateGroupRequest request = CreateGroupRequest.builder()
                .name("DSA Grind")
                .memberIds(List.of(2L))
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(aarav));
        when(userRepository.findById(2L)).thenReturn(Optional.of(priya));
        when(roomRepository.save(any(ChatRoom.class))).thenReturn(sampleGroup);
        when(roomMapper.toResponse(any(ChatRoom.class), eq(1L), isNull(), eq(0L)))
                .thenReturn(RoomResponse.builder().id(10L).name("DSA Grind").type(RoomType.GROUP).myRole(MemberRole.ADMIN).build());

        RoomResponse response = roomService.createGroup(request, 1L);

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("DSA Grind");
        assertThat(response.getMyRole()).isEqualTo(MemberRole.ADMIN);
        verify(roomRepository).save(any(ChatRoom.class));
    }

    @Test
    @DisplayName("Should return existing private room if already created")
    void getOrCreatePrivateRoom_Existing() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(priya));
        when(userRepository.findById(1L)).thenReturn(Optional.of(aarav));
        when(roomRepository.findPrivateRoomBetweenUsers(1L, 2L)).thenReturn(Optional.of(samplePrivate));
        when(messageRepository.findTop1ByRoomIdOrderByCreatedAtDesc(20L)).thenReturn(Optional.empty());
        when(roomMapper.toResponse(eq(samplePrivate), eq(1L), isNull(), eq(0L)))
                .thenReturn(RoomResponse.builder().id(20L).type(RoomType.PRIVATE).name("priya_patel").build());

        RoomResponse response = roomService.getOrCreatePrivateRoom(2L, 1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(20L);
        assertThat(response.getType()).isEqualTo(RoomType.PRIVATE);
        verify(roomRepository, never()).save(any(ChatRoom.class));
    }

    @Test
    @DisplayName("Should create new private room if none exists")
    void getOrCreatePrivateRoom_CreatesNew() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(priya));
        when(userRepository.findById(1L)).thenReturn(Optional.of(aarav));
        when(roomRepository.findPrivateRoomBetweenUsers(1L, 2L)).thenReturn(Optional.empty());
        when(roomRepository.save(any(ChatRoom.class))).thenReturn(samplePrivate);
        when(roomMapper.toResponse(eq(samplePrivate), eq(1L), isNull(), eq(0L)))
                .thenReturn(RoomResponse.builder().id(20L).type(RoomType.PRIVATE).build());

        RoomResponse response = roomService.getOrCreatePrivateRoom(2L, 1L);

        assertThat(response).isNotNull();
        verify(roomRepository).save(any(ChatRoom.class));
    }

    @Test
    @DisplayName("Should throw BadRequestException if creating private room with oneself")
    void getOrCreatePrivateRoom_WithSelf_ThrowsException() {
        assertThatThrownBy(() -> roomService.getOrCreatePrivateRoom(1L, 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot create a private chat room with yourself");
    }

    @Test
    @DisplayName("Should allow ADMIN to add member to group")
    void addMember_AsAdmin_Success() {
        AddMemberRequest request = AddMemberRequest.builder().userId(2L).role(MemberRole.MEMBER).build();

        RoomMember requestingMember = RoomMember.builder().room(sampleGroup).user(aarav).role(MemberRole.ADMIN).build();
        when(roomRepository.findById(10L)).thenReturn(Optional.of(sampleGroup));
        when(memberRepository.findByRoomIdAndUserId(10L, 1L)).thenReturn(Optional.of(requestingMember));
        when(memberRepository.existsByRoomIdAndUserId(10L, 2L)).thenReturn(false);
        when(userRepository.findById(2L)).thenReturn(Optional.of(priya));
        when(roomMapper.toResponse(any(), eq(1L), any(), anyLong()))
                .thenReturn(RoomResponse.builder().id(10L).name("DSA Grind").build());

        RoomResponse response = roomService.addMember(10L, request, 1L);

        assertThat(response).isNotNull();
        verify(memberRepository).save(any(RoomMember.class));
    }

    @Test
    @DisplayName("Should reject non-admin from adding members")
    void addMember_AsNonAdmin_ThrowsUnauthorized() {
        AddMemberRequest request = AddMemberRequest.builder().userId(2L).role(MemberRole.MEMBER).build();

        RoomMember nonAdminMember = RoomMember.builder().room(sampleGroup).user(aarav).role(MemberRole.MEMBER).build();
        when(roomRepository.findById(10L)).thenReturn(Optional.of(sampleGroup));
        when(memberRepository.findByRoomIdAndUserId(10L, 1L)).thenReturn(Optional.of(nonAdminMember));

        assertThatThrownBy(() -> roomService.addMember(10L, request, 1L))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Only group admins can add members");
    }
}

