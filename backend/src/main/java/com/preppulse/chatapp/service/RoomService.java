package com.preppulse.chatapp.service;

import com.preppulse.chatapp.dto.AddMemberRequest;
import com.preppulse.chatapp.dto.CreateGroupRequest;
import com.preppulse.chatapp.dto.RoomResponse;
import com.preppulse.chatapp.entity.*;
import com.preppulse.chatapp.exception.BadRequestException;
import com.preppulse.chatapp.exception.ResourceNotFoundException;
import com.preppulse.chatapp.exception.UnauthorizedException;
import com.preppulse.chatapp.mapper.RoomMapper;
import com.preppulse.chatapp.repository.ChatRoomRepository;
import com.preppulse.chatapp.repository.MessageRepository;
import com.preppulse.chatapp.repository.RoomMemberRepository;
import com.preppulse.chatapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomService {

    private final ChatRoomRepository roomRepository;
    private final RoomMemberRepository memberRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final RoomMapper roomMapper;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void markRoomAsRead(Long roomId, Long currentUserId) {
        RoomMember member = memberRepository.findByRoomIdAndUserId(roomId, currentUserId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of room #" + roomId));

        Message lastMessage = messageRepository.findTop1ByRoomIdOrderByCreatedAtDesc(roomId).orElse(null);
        if (lastMessage == null) {
            return;
        }

        Long latestId = lastMessage.getId();
        member.setLastReadMessageId(latestId);
        memberRepository.save(member);

        // Update unread messages sent by others to SEEN
        messageRepository.updateMessageStatuses(roomId, currentUserId, latestId, MessageStatus.SEEN);

        User reader = userRepository.findById(currentUserId).orElse(null);
        String readerUsername = reader != null ? reader.getUsername() : "";

        com.preppulse.chatapp.dto.MessageStatusUpdateDto updateDto = com.preppulse.chatapp.dto.MessageStatusUpdateDto.builder()
                .roomId(roomId)
                .readerId(currentUserId)
                .readerUsername(readerUsername)
                .lastReadMessageId(latestId)
                .status(MessageStatus.SEEN)
                .timestamp(Instant.now())
                .build();

        messagingTemplate.convertAndSend("/topic/room." + roomId, updateDto);
        log.debug("Room #{} marked as read up to message #{} by @{}", roomId, latestId, readerUsername);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getUserRooms(Long currentUserId) {
        List<ChatRoom> rooms = roomRepository.findAllByUserId(currentUserId);

        return rooms.stream()
                .map(room -> {
                    Message lastMsg = messageRepository.findTop1ByRoomIdOrderByCreatedAtDesc(room.getId()).orElse(null);
                    RoomMember myMembership = room.getMembers().stream()
                            .filter(m -> Objects.equals(m.getUser().getId(), currentUserId))
                            .findFirst()
                            .orElse(null);

                    Long lastReadId = myMembership != null ? myMembership.getLastReadMessageId() : null;
                    long unreadCount = messageRepository.countUnreadMessages(room.getId(), lastReadId, currentUserId);

                    return roomMapper.toResponse(room, currentUserId, lastMsg, unreadCount);
                })
                .sorted((a, b) -> {
                    Instant timeA = a.getLastMessage() != null ? a.getLastMessage().getCreatedAt() : a.getCreatedAt();
                    Instant timeB = b.getLastMessage() != null ? b.getLastMessage().getCreatedAt() : b.getCreatedAt();
                    return timeB.compareTo(timeA); // Newest first
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoomDetails(Long roomId, Long currentUserId) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));

        boolean isMember = room.getMembers().stream()
                .anyMatch(m -> Objects.equals(m.getUser().getId(), currentUserId));

        if (!isMember) {
            throw new UnauthorizedException("You are not a member of room #" + roomId);
        }

        Message lastMsg = messageRepository.findTop1ByRoomIdOrderByCreatedAtDesc(roomId).orElse(null);
        RoomMember myMembership = room.getMembers().stream()
                .filter(m -> Objects.equals(m.getUser().getId(), currentUserId))
                .findFirst()
                .orElse(null);

        Long lastReadId = myMembership != null ? myMembership.getLastReadMessageId() : null;
        long unreadCount = messageRepository.countUnreadMessages(roomId, lastReadId, currentUserId);

        return roomMapper.toResponse(room, currentUserId, lastMsg, unreadCount);
    }

    @Transactional
    public RoomResponse createGroup(CreateGroupRequest request, Long currentUserId) {
        User creator = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

        ChatRoom room = ChatRoom.builder()
                .name(request.getName().trim())
                .type(RoomType.GROUP)
                .createdBy(creator)
                .build();

        // Add creator as ADMIN
        RoomMember creatorMember = RoomMember.builder()
                .room(room)
                .user(creator)
                .role(MemberRole.ADMIN)
                .build();
        room.getMembers().add(creatorMember);

        // Add optional initial members
        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            Set<Long> uniqueMemberIds = new HashSet<>(request.getMemberIds());
            uniqueMemberIds.remove(currentUserId); // already added

            for (Long memberId : uniqueMemberIds) {
                userRepository.findById(memberId).ifPresent(user -> {
                    RoomMember member = RoomMember.builder()
                            .room(room)
                            .user(user)
                            .role(MemberRole.MEMBER)
                            .build();
                    room.getMembers().add(member);
                });
            }
        }

        ChatRoom savedRoom = roomRepository.save(room);
        log.info("Created new group room '{}' (ID: {}) by user ID: {}", savedRoom.getName(), savedRoom.getId(), currentUserId);

        return roomMapper.toResponse(savedRoom, currentUserId, null, 0);
    }

    @Transactional
    public RoomResponse getOrCreatePrivateRoom(Long targetUserId, Long currentUserId) {
        if (Objects.equals(targetUserId, currentUserId)) {
            throw new BadRequestException("Cannot create a private chat room with yourself");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + targetUserId));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found with id: " + currentUserId));

        // Check if private room already exists between these 2 users
        Optional<ChatRoom> existingRoom = roomRepository.findPrivateRoomBetweenUsers(currentUserId, targetUserId);
        if (existingRoom.isPresent()) {
            ChatRoom room = existingRoom.get();
            Message lastMsg = messageRepository.findTop1ByRoomIdOrderByCreatedAtDesc(room.getId()).orElse(null);
            RoomMember myMembership = room.getMembers().stream()
                    .filter(m -> Objects.equals(m.getUser().getId(), currentUserId))
                    .findFirst()
                    .orElse(null);

            Long lastReadId = myMembership != null ? myMembership.getLastReadMessageId() : null;
            long unread = messageRepository.countUnreadMessages(room.getId(), lastReadId, currentUserId);

            return roomMapper.toResponse(room, currentUserId, lastMsg, unread);
        }

        // Create new private chat
        ChatRoom newRoom = ChatRoom.builder()
                .name(null)
                .type(RoomType.PRIVATE)
                .createdBy(currentUser)
                .build();

        RoomMember member1 = RoomMember.builder()
                .room(newRoom)
                .user(currentUser)
                .role(MemberRole.MEMBER)
                .build();

        RoomMember member2 = RoomMember.builder()
                .room(newRoom)
                .user(targetUser)
                .role(MemberRole.MEMBER)
                .build();

        newRoom.getMembers().add(member1);
        newRoom.getMembers().add(member2);

        ChatRoom savedRoom = roomRepository.save(newRoom);
        log.info("Created private chat between user {} and user {} (Room ID: {})", currentUserId, targetUserId, savedRoom.getId());

        return roomMapper.toResponse(savedRoom, currentUserId, null, 0);
    }

    @Transactional
    public RoomResponse addMember(Long roomId, AddMemberRequest request, Long requestingUserId) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));

        if (room.getType() != RoomType.GROUP) {
            throw new BadRequestException("Cannot add members to a private 1-to-1 chat");
        }

        RoomMember requestingMember = memberRepository.findByRoomIdAndUserId(roomId, requestingUserId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this room"));

        if (requestingMember.getRole() != MemberRole.ADMIN) {
            throw new UnauthorizedException("Only group admins can add members to the room");
        }

        if (memberRepository.existsByRoomIdAndUserId(roomId, request.getUserId())) {
            throw new BadRequestException("Student is already a member of this room");
        }

        User targetUser = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + request.getUserId()));

        RoomMember newMember = RoomMember.builder()
                .room(room)
                .user(targetUser)
                .role(request.getRole() != null ? request.getRole() : MemberRole.MEMBER)
                .build();

        memberRepository.save(newMember);
        room.getMembers().add(newMember);

        log.info("User ID {} added student {} to group #{}", requestingUserId, targetUser.getUsername(), roomId);

        Message lastMsg = messageRepository.findTop1ByRoomIdOrderByCreatedAtDesc(roomId).orElse(null);
        return roomMapper.toResponse(room, requestingUserId, lastMsg, 0);
    }

    @Transactional
    public void removeMember(Long roomId, Long targetUserId, Long requestingUserId) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));

        if (room.getType() != RoomType.GROUP) {
            throw new BadRequestException("Cannot leave or remove members from a private chat");
        }

        RoomMember targetMember = memberRepository.findByRoomIdAndUserId(roomId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student is not a member of this room"));

        boolean isSelfLeaving = Objects.equals(targetUserId, requestingUserId);

        if (!isSelfLeaving) {
            // Removing someone else: must be ADMIN
            RoomMember requestingMember = memberRepository.findByRoomIdAndUserId(roomId, requestingUserId)
                    .orElseThrow(() -> new UnauthorizedException("You are not a member of this room"));

            if (requestingMember.getRole() != MemberRole.ADMIN) {
                throw new UnauthorizedException("Only group admins can remove members");
            }
        }

        // Perform removal
        memberRepository.deleteByRoomIdAndUserId(roomId, targetUserId);
        room.getMembers().removeIf(m -> Objects.equals(m.getUser().getId(), targetUserId));

        log.info("User {} {} group #{}", targetUserId, isSelfLeaving ? "left" : "was removed from", roomId);

        // Check if room is empty
        long remainingCount = memberRepository.countByRoomId(roomId);
        if (remainingCount == 0) {
            roomRepository.delete(room);
            log.info("Room #{} had 0 members remaining and was deleted", roomId);
            return;
        }

        // If an admin left, ensure at least one admin remains
        if (targetMember.getRole() == MemberRole.ADMIN) {
            List<RoomMember> remainingMembers = memberRepository.findAllByRoomId(roomId);
            boolean hasAdmin = remainingMembers.stream().anyMatch(m -> m.getRole() == MemberRole.ADMIN);
            if (!hasAdmin && !remainingMembers.isEmpty()) {
                RoomMember oldestMember = remainingMembers.get(0);
                oldestMember.setRole(MemberRole.ADMIN);
                memberRepository.save(oldestMember);
                log.info("Auto-promoted student {} to ADMIN for group #{}", oldestMember.getUser().getUsername(), roomId);
            }
        }
    }
}

