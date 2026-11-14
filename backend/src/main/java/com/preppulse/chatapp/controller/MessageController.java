package com.preppulse.chatapp.controller;

import com.preppulse.chatapp.dto.ChatMessageRequest;
import com.preppulse.chatapp.dto.ChatMessageResponse;
import com.preppulse.chatapp.security.UserPrincipal;
import com.preppulse.chatapp.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms/{id}/messages")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Messages", description = "Endpoints for fetching and sending messages")
public class MessageController {

    private final MessageService messageService;

    @GetMapping
    @Operation(summary = "Get room messages with pagination", description = "Fetches messages for a room (newest first) with pagination support")
    public ResponseEntity<Page<ChatMessageResponse>> getMessages(
            @PathVariable("id") Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ChatMessageResponse> messages = messageService.getRoomMessages(roomId, principal.getId(), pageRequest);
        return ResponseEntity.ok(messages);
    }

    @PostMapping
    @Operation(summary = "Send message via REST", description = "Persists message in PostgreSQL and broadcasts it to WebSocket subscribers of /topic/room.{id}")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @PathVariable("id") Long roomId,
            @Valid @RequestBody ChatMessageRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ChatMessageResponse response = messageService.saveAndBroadcastMessage(roomId, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{messageId}")
    @Operation(summary = "Delete message", description = "Soft-deletes a message and broadcasts the deletion event across WebSocket")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable("id") Long roomId,
            @PathVariable("messageId") Long messageId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        messageService.deleteMessage(roomId, messageId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @Operation(summary = "Search messages in room", description = "Searches messages in the specified room matching the text query")
    public ResponseEntity<java.util.List<ChatMessageResponse>> searchMessages(
            @PathVariable("id") Long roomId,
            @RequestParam("q") String query,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(messageService.searchMessages(roomId, query, principal.getId()));
    }
}

