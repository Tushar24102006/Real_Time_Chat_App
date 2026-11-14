package com.preppulse.chatapp.service;

import com.preppulse.chatapp.dto.UserDto;
import com.preppulse.chatapp.entity.User;
import com.preppulse.chatapp.exception.ResourceNotFoundException;
import com.preppulse.chatapp.mapper.UserMapper;
import com.preppulse.chatapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        return userMapper.toDto(user);
    }

    @Transactional(readOnly = true)
    public List<UserDto> searchUsers(String query, Long currentUserId) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return userRepository.searchUsers(query.trim(), currentUserId)
                .stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }
}

