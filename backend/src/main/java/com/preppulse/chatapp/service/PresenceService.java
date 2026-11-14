package com.preppulse.chatapp.service;

import com.preppulse.chatapp.dto.UserPresenceDto;
import com.preppulse.chatapp.entity.User;
import com.preppulse.chatapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class PresenceService {

    private static final String PRESENCE_KEY_PREFIX = "presence:user:";
    private static final String TOPIC_PRESENCE = "/topic/presence";

    private final RedisTemplate<String, String> redisTemplate;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Called when a STOMP session connects (tab opened)
     */
    public void userConnected(Long userId, String username) {
        if (userId == null) return;

        String key = PRESENCE_KEY_PREFIX + userId;
        Long sessions = redisTemplate.opsForValue().increment(key);
        // Guard against corrupt negative counters
        if (sessions != null && sessions < 1) {
            redisTemplate.opsForValue().set(key, "1");
            sessions = 1L;
        }
        log.info("User @{} connected. Active tabs/sessions: {}", username, sessions);

        // If this is the user's first active tab, broadcast online status
        if (sessions != null && sessions == 1) {
            UserPresenceDto presence = UserPresenceDto.builder()
                    .userId(userId)
                    .username(username)
                    .online(true)
                    .lastSeenAt(null)
                    .build();

            messagingTemplate.convertAndSend(TOPIC_PRESENCE, presence);
            log.info("Broadcasted ONLINE presence for user @{}", username);
        }
    }

    /**
     * Called when a STOMP session disconnects (tab closed or network drop)
     */
    @Transactional
    public void userDisconnected(Long userId, String username) {
        if (userId == null) return;

        String key = PRESENCE_KEY_PREFIX + userId;
        Long sessions = redisTemplate.opsForValue().decrement(key);

        if (sessions == null || sessions <= 0) {
            // Remove key entirely from Redis
            redisTemplate.delete(key);

            Instant now = Instant.now();

            // Persist last_seen_at in PostgreSQL
            userRepository.findById(userId).ifPresent(user -> {
                user.setLastSeenAt(now);
                userRepository.save(user);
            });

            // Broadcast offline presence with lastSeenAt
            UserPresenceDto presence = UserPresenceDto.builder()
                    .userId(userId)
                    .username(username)
                    .online(false)
                    .lastSeenAt(now)
                    .build();

            messagingTemplate.convertAndSend(TOPIC_PRESENCE, presence);
            log.info("User @{} has 0 active sessions. Broadcasted OFFLINE presence (lastSeen: {})", username, now);
        } else {
            log.info("User @{} closed a tab. Remaining active sessions: {}", username, sessions);
        }
    }

    /**
     * Check if a specific user is currently online
     */
    public boolean isUserOnline(Long userId) {
        if (userId == null) return false;
        String val = redisTemplate.opsForValue().get(PRESENCE_KEY_PREFIX + userId);
        return val != null && Long.parseLong(val) > 0;
    }

    /**
     * Returns a map of all currently online user IDs
     */
    public Map<Long, Boolean> getOnlineUsers() {
        Set<String> keys = redisTemplate.keys(PRESENCE_KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<Long, Boolean> result = new HashMap<>();
        for (String key : keys) {
            try {
                Long userId = Long.parseLong(key.replace(PRESENCE_KEY_PREFIX, ""));
                String val = redisTemplate.opsForValue().get(key);
                if (val != null && Long.parseLong(val) > 0) {
                    result.put(userId, true);
                }
            } catch (Exception ignored) {}
        }
        return result;
    }
}

