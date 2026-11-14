package com.preppulse.chatapp.dto;

import com.preppulse.chatapp.entity.MessageStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageStatusUpdateDto {
    private Long roomId;
    private Long readerId;
    private String readerUsername;
    private Long lastReadMessageId;
    private MessageStatus status;
    private Instant timestamp;
}

