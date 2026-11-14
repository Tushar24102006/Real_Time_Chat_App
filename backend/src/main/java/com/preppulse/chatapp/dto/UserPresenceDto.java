package com.preppulse.chatapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPresenceDto {
    private Long userId;
    private String username;
    private boolean online;
    private Instant lastSeenAt;
}

