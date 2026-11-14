package com.preppulse.chatapp.controller;

import com.preppulse.chatapp.dto.UserDto;
import com.preppulse.chatapp.security.UserPrincipal;
import com.preppulse.chatapp.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Users", description = "Endpoints for managing user accounts and search")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated student profile", description = "Returns profile details of the user associated with the JWT Bearer token")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        UserDto user = userService.getCurrentUser(principal.getId());
        return ResponseEntity.ok(user);
    }

    @GetMapping("/search")
    @Operation(summary = "Search students by username or email", description = "Finds students in the placement network matching search keyword")
    public ResponseEntity<List<UserDto>> searchUsers(
            @RequestParam("q") String query,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<UserDto> users = userService.searchUsers(query, principal.getId());
        return ResponseEntity.ok(users);
    }
}

