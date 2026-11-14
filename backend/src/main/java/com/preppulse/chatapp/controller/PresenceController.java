package com.preppulse.chatapp.controller;

import com.preppulse.chatapp.service.PresenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Presence", description = "Endpoints for online presence snapshot")
public class PresenceController {

    private final PresenceService presenceService;

    @GetMapping
    @Operation(summary = "Get online users map", description = "Returns an object mapping user IDs to their online status")
    public ResponseEntity<Map<Long, Boolean>> getOnlineUsers() {
        return ResponseEntity.ok(presenceService.getOnlineUsers());
    }
}

