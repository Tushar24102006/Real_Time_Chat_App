package com.preppulse.chatapp.mapper;

import com.preppulse.chatapp.dto.MessageSummaryDto;
import com.preppulse.chatapp.dto.RoomMemberDto;
import com.preppulse.chatapp.dto.RoomResponse;
import com.preppulse.chatapp.dto.UserDto;
import com.preppulse.chatapp.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class RoomMapper {

    private final UserMapper userMapper;

    public RoomResponse toResponse(ChatRoom room, Long currentUserId, Message lastMessage, long unreadCount) {
        if (room == null) {
            return null;
        }

        List<RoomMember> members = room.getMembers() != null ? room.getMembers() : Collections.emptyList();

        MemberRole myRole = members.stream()
                .filter(m -> Objects.equals(m.getUser().getId(), currentUserId))
                .map(RoomMember::getRole)
                .findFirst()
                .orElse(null);

        String computedName = room.getName();
        UserDto otherUser = null;

        if (room.getType() == RoomType.PRIVATE) {
            RoomMember otherMember = members.stream()
                    .filter(m -> !Objects.equals(m.getUser().getId(), currentUserId))
                    .findFirst()
                    .orElse(null);

            if (otherMember != null) {
                computedName = otherMember.getUser().getUsername();
                otherUser = userMapper.toDto(otherMember.getUser());
            } else {
                computedName = "Direct Chat";
            }
        }

        List<RoomMemberDto> memberDtos = members.stream()
                .map(this::toMemberDto)
                .collect(Collectors.toList());

        MessageSummaryDto messageSummary = lastMessage != null ? toMessageSummary(lastMessage) : null;

        return RoomResponse.builder()
                .id(room.getId())
                .name(computedName)
                .type(room.getType())
                .createdById(room.getCreatedBy() != null ? room.getCreatedBy().getId() : null)
                .createdAt(room.getCreatedAt())
                .lastMessage(messageSummary)
                .unreadCount(unreadCount)
                .memberCount(members.size())
                .members(memberDtos)
                .otherUser(otherUser)
                .myRole(myRole)
                .build();
    }

    public RoomMemberDto toMemberDto(RoomMember member) {
        if (member == null) return null;
        User user = member.getUser();
        return RoomMemberDto.builder()
                .id(member.getId())
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .role(member.getRole())
                .lastSeenAt(user.getLastSeenAt())
                .joinedAt(member.getJoinedAt())
                .build();
    }

    public MessageSummaryDto toMessageSummary(Message message) {
        if (message == null) return null;
        return MessageSummaryDto.builder()
                .id(message.getId())
                .senderId(message.getSender().getId())
                .senderUsername(message.getSender().getUsername())
                .content(message.isDeleted() ? "This message was deleted" : message.getContent())
                .type(message.getType())
                .status(message.getStatus())
                .createdAt(message.getCreatedAt())
                .build();
    }
}

