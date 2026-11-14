package com.preppulse.chatapp.repository;

import com.preppulse.chatapp.entity.RoomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {

    Optional<RoomMember> findByRoomIdAndUserId(Long roomId, Long userId);

    List<RoomMember> findAllByRoomId(Long roomId);

    List<RoomMember> findAllByUserId(Long userId);

    boolean existsByRoomIdAndUserId(Long roomId, Long userId);

    long countByRoomId(Long roomId);

    void deleteByRoomIdAndUserId(Long roomId, Long userId);
}

