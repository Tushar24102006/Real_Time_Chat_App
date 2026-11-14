package com.preppulse.chatapp.dto;

import com.preppulse.chatapp.entity.MemberRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomMemberDto {
    private Long id;
    private Long userId;
    private String username;
    private String email;
    private String avatarUrl;
    private MemberRole role;
    private Instant lastSeenAt;
    private Instant joinedAt;
}

