package com.preppulse.chatapp.repository;

import com.preppulse.chatapp.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    @Query("SELECT DISTINCT r FROM ChatRoom r " +
           "JOIN r.members m " +
           "WHERE m.user.id = :userId")
    List<ChatRoom> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT r FROM ChatRoom r " +
           "WHERE r.type = com.preppulse.chatapp.entity.RoomType.PRIVATE " +
           "AND EXISTS (SELECT m1 FROM RoomMember m1 WHERE m1.room = r AND m1.user.id = :user1Id) " +
           "AND EXISTS (SELECT m2 FROM RoomMember m2 WHERE m2.room = r AND m2.user.id = :user2Id)")
    Optional<ChatRoom> findPrivateRoomBetweenUsers(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);
}

