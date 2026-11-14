package com.preppulse.chatapp.mapper;

import com.preppulse.chatapp.dto.UserDto;
import com.preppulse.chatapp.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserDto toDto(User user) {
        if (user == null) {
            return null;
        }
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .lastSeenAt(user.getLastSeenAt())
                .createdAt(user.getCreatedAt())
                .build();
    }
}

