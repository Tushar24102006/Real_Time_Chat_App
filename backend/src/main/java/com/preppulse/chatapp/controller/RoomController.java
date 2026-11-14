package com.preppulse.chatapp.controller;

import com.preppulse.chatapp.dto.AddMemberRequest;
import com.preppulse.chatapp.dto.CreateGroupRequest;
import com.preppulse.chatapp.dto.RoomResponse;
import com.preppulse.chatapp.security.UserPrincipal;
import com.preppulse.chatapp.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Chat Rooms", description = "Endpoints for private direct chats, study groups, and memberships")
public class RoomController {

    private final RoomService roomService;

    @GetMapping
    @Operation(summary = "Get user's chat rooms", description = "Returns all study groups and private conversations for the logged-in student, sorted newest first with last message and unread count")
    public ResponseEntity<List<RoomResponse>> getMyRooms(@AuthenticationPrincipal UserPrincipal principal) {
        List<RoomResponse> rooms = roomService.getUserRooms(principal.getId());
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get room details", description = "Returns full details for a chat room including its member list and roles")
    public ResponseEntity<RoomResponse> getRoomDetails(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RoomResponse room = roomService.getRoomDetails(id, principal.getId());
        return ResponseEntity.ok(room);
    }

    @PostMapping
    @Operation(summary = "Create a study group", description = "Creates a new GROUP chat room, sets the creator as ADMIN, and adds initial members")
    public ResponseEntity<RoomResponse> createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RoomResponse room = roomService.createGroup(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(room);
    }

    @PostMapping("/private/{userId}")
    @Operation(summary = "Get or create private direct chat", description = "Gets the existing 1-to-1 conversation with another student, or creates a new PRIVATE room if none exists")
    public ResponseEntity<RoomResponse> getOrCreatePrivateRoom(
            @PathVariable("userId") Long targetUserId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RoomResponse room = roomService.getOrCreatePrivateRoom(targetUserId, principal.getId());
        return ResponseEntity.ok(room);
    }

    @PostMapping("/{id}/members")
    @Operation(summary = "Add member to study group", description = "Adds a new student to a group room. Only group ADMINs can perform this action.")
    public ResponseEntity<RoomResponse> addMember(
            @PathVariable("id") Long id,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RoomResponse room = roomService.addMember(id, request, principal.getId());
        return ResponseEntity.ok(room);
    }

    @DeleteMapping("/{id}/members/{userId}")
    @Operation(summary = "Remove member or leave group", description = "Allows a student to leave a group, or an ADMIN to remove another member")
    public ResponseEntity<Void> removeMember(
            @PathVariable("id") Long id,
            @PathVariable("userId") Long targetUserId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        roomService.removeMember(id, targetUserId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark room as read", description = "Updates the student's last_read_message_id and broadcasts message status updates to room members")
    public ResponseEntity<Void> markAsRead(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        roomService.markRoomAsRead(id, principal.getId());
        return ResponseEntity.ok().build();
    }
}

