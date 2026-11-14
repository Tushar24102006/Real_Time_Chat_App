package com.preppulse.chatapp.repository;

import com.preppulse.chatapp.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Optional<Message> findTop1ByRoomIdOrderByCreatedAtDesc(Long roomId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.room.id = :roomId AND (:lastReadId IS NULL OR m.id > :lastReadId) AND m.sender.id != :userId")
    long countUnreadMessages(
            @Param("roomId") Long roomId,
            @Param("lastReadId") Long lastReadId,
            @Param("userId") Long userId
    );

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Message m SET m.status = :status WHERE m.room.id = :roomId AND m.sender.id != :readerId AND (:lastReadId IS NULL OR m.id <= :lastReadId) AND m.status != :status")
    int updateMessageStatuses(
            @Param("roomId") Long roomId,
            @Param("readerId") Long readerId,
            @Param("lastReadId") Long lastReadId,
            @Param("status") com.preppulse.chatapp.entity.MessageStatus status
    );

    Page<Message> findByRoomIdOrderByCreatedAtDesc(Long roomId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.room.id = :roomId AND m.deleted = false AND LOWER(m.content) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY m.createdAt DESC")
    java.util.List<Message> searchRoomMessages(@Param("roomId") Long roomId, @Param("query") String query);
}

