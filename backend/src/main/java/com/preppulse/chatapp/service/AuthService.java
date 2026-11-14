package com.preppulse.chatapp.service;

import com.preppulse.chatapp.dto.AuthResponse;
import com.preppulse.chatapp.dto.LoginRequest;
import com.preppulse.chatapp.dto.RegisterRequest;
import com.preppulse.chatapp.entity.User;
import com.preppulse.chatapp.exception.BadRequestException;
import com.preppulse.chatapp.mapper.UserMapper;
import com.preppulse.chatapp.repository.UserRepository;
import com.preppulse.chatapp.security.JwtUtil;
import com.preppulse.chatapp.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserMapper userMapper;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String trimmedUsername = request.getUsername().trim();
        String trimmedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsernameIgnoreCase(trimmedUsername)) {
            throw new BadRequestException("Username '" + trimmedUsername + "' is already taken");
        }

        if (userRepository.existsByEmailIgnoreCase(trimmedEmail)) {
            throw new BadRequestException("Email '" + trimmedEmail + "' is already registered");
        }

        User user = User.builder()
                .username(trimmedUsername)
                .email(trimmedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .lastSeenAt(Instant.now())
                .build();

        User savedUser = userRepository.save(user);
        UserPrincipal userPrincipal = UserPrincipal.create(savedUser);
        String token = jwtUtil.generateToken(userPrincipal);

        log.info("User registered successfully with ID: {}", savedUser.getId());

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getExpirationMs() / 1000)
                .user(userMapper.toDto(savedUser))
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsernameOrEmail().trim(),
                        request.getPassword()
                )
        );

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new BadRequestException("User record not found"));

        String token = jwtUtil.generateToken(userPrincipal);

        log.info("User logged in successfully: {}", userPrincipal.getUsername());

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getExpirationMs() / 1000)
                .user(userMapper.toDto(user))
                .build();
    }
}

