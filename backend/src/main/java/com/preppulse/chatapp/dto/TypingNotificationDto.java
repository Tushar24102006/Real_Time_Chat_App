package com.preppulse.chatapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TypingNotificationDto {
    private Long roomId;
    private Long userId;
    private String username;
    private boolean typing;
}

