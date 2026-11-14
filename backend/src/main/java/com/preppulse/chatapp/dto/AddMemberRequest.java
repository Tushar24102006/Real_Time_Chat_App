package com.preppulse.chatapp.dto;

import com.preppulse.chatapp.entity.MemberRole;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddMemberRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @Builder.Default
    private MemberRole role = MemberRole.MEMBER;
}

