package com.preppulse.chatapp.service;

import com.preppulse.chatapp.dto.AuthResponse;
import com.preppulse.chatapp.dto.LoginRequest;
import com.preppulse.chatapp.dto.RegisterRequest;
import com.preppulse.chatapp.dto.UserDto;
import com.preppulse.chatapp.entity.User;
import com.preppulse.chatapp.exception.BadRequestException;
import com.preppulse.chatapp.mapper.UserMapper;
import com.preppulse.chatapp.repository.UserRepository;
import com.preppulse.chatapp.security.JwtUtil;
import com.preppulse.chatapp.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private AuthService authService;

    private User sampleUser;
    private UserDto sampleUserDto;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .username("aarav_sharma")
                .email("aarav.sharma@campus.edu")
                .passwordHash("encodedPassword")
                .createdAt(Instant.now())
                .build();

        sampleUserDto = UserDto.builder()
                .id(1L)
                .username("aarav_sharma")
                .email("aarav.sharma@campus.edu")
                .build();
    }

    @Test
    @DisplayName("Should successfully register a new user")
    void register_Success() {
        RegisterRequest request = RegisterRequest.builder()
                .username("aarav_sharma")
                .email("aarav.sharma@campus.edu")
                .password("Password@123")
                .build();

        when(userRepository.existsByUsernameIgnoreCase("aarav_sharma")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("aarav.sharma@campus.edu")).thenReturn(false);
        when(passwordEncoder.encode("Password@123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);
        when(jwtUtil.generateToken(any(UserPrincipal.class))).thenReturn("mock.jwt.token");
        when(jwtUtil.getExpirationMs()).thenReturn(3600000L);
        when(userMapper.toDto(sampleUser)).thenReturn(sampleUserDto);

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("mock.jwt.token");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getExpiresIn()).isEqualTo(3600L);
        assertThat(response.getUser().getUsername()).isEqualTo("aarav_sharma");

        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw BadRequestException when registering duplicate username")
    void register_DuplicateUsername_ThrowsException() {
        RegisterRequest request = RegisterRequest.builder()
                .username("aarav_sharma")
                .email("new.email@campus.edu")
                .password("Password@123")
                .build();

        when(userRepository.existsByUsernameIgnoreCase("aarav_sharma")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Username 'aarav_sharma' is already taken");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw BadRequestException when registering duplicate email")
    void register_DuplicateEmail_ThrowsException() {
        RegisterRequest request = RegisterRequest.builder()
                .username("new_student")
                .email("aarav.sharma@campus.edu")
                .password("Password@123")
                .build();

        when(userRepository.existsByUsernameIgnoreCase("new_student")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("aarav.sharma@campus.edu")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Email 'aarav.sharma@campus.edu' is already registered");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should successfully login with valid credentials")
    void login_Success() {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("aarav_sharma")
                .password("Password@123")
                .build();

        UserPrincipal principal = UserPrincipal.create(sampleUser);
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(principal);

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(jwtUtil.generateToken(principal)).thenReturn("mock.login.token");
        when(jwtUtil.getExpirationMs()).thenReturn(3600000L);
        when(userMapper.toDto(sampleUser)).thenReturn(sampleUserDto);

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("mock.login.token");
        assertThat(response.getUser().getUsername()).isEqualTo("aarav_sharma");
    }

    @Test
    @DisplayName("Should propagate BadCredentialsException when credentials fail")
    void login_InvalidCredentials_ThrowsException() {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("aarav_sharma")
                .password("wrongpassword")
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }
}

