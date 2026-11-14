package com.preppulse.chatapp.dto;

import com.preppulse.chatapp.entity.MessageStatus;
import com.preppulse.chatapp.entity.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageSummaryDto {
    private Long id;
    private Long senderId;
    private String senderUsername;
    private String content;
    private MessageType type;
    private MessageStatus status;
    private Instant createdAt;
}

