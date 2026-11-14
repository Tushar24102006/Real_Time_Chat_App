package com.preppulse.chatapp.dto;

import com.preppulse.chatapp.entity.MemberRole;
import com.preppulse.chatapp.entity.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomResponse {
    private Long id;
    private String name;
    private RoomType type;
    private Long createdById;
    private Instant createdAt;
    private MessageSummaryDto lastMessage;
    private long unreadCount;
    private int memberCount;
    @Builder.Default
    private List<RoomMemberDto> members = new ArrayList<>();
    private UserDto otherUser;
    private MemberRole myRole;
}

