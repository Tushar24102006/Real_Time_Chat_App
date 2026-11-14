package com.preppulse.chatapp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.preppulse.chatapp.dto.LoginRequest;
import com.preppulse.chatapp.dto.RegisterRequest;
import com.preppulse.chatapp.entity.User;
import com.preppulse.chatapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        // Seed test student
        User testUser = User.builder()
                .username("priya_patel")
                .email("priya.patel@campus.edu")
                .passwordHash(passwordEncoder.encode("Password@123"))
                .build();
        userRepository.save(testUser);
    }

    @Test
    @DisplayName("POST /api/auth/login - Success with valid credentials")
    void login_Success() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("priya_patel")
                .password("Password@123")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.expiresIn", is(3600)))
                .andExpect(jsonPath("$.user.username", is("priya_patel")))
                .andExpect(jsonPath("$.user.email", is("priya.patel@campus.edu")));
    }

    @Test
    @DisplayName("POST /api/auth/login - Failure with incorrect password")
    void login_Failure_BadCredentials() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("priya_patel")
                .password("WrongPassword999")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")))
                .andExpect(jsonPath("$.message", containsString("Invalid username/email or password")));
    }

    @Test
    @DisplayName("POST /api/auth/register - Validation error on short password")
    void register_ValidationError_ShortPassword() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .username("rohan_verma")
                .email("rohan.verma@campus.edu")
                .password("short") // less than 8 chars
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Validation Failed")))
                .andExpect(jsonPath("$.validationErrors.password", containsString("at least 8 characters")));
    }
}

