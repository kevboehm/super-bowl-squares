"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/contexts/SocketContext";

export function useGameSocket(
  gameCode: string | undefined,
  onRefresh: () => void
) {
  const socket = useSocket();
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!socket || !gameCode) return;

    socket.emit("join-game", gameCode);

    const handleUpdate = () => {
      onRefreshRef.current();
    };

    socket.on("square-updated", handleUpdate);
    socket.on("game-started", handleUpdate);
    socket.on("picks-submitted", handleUpdate);
    socket.on("winner-updated", handleUpdate);

    return () => {
      socket.off("square-updated", handleUpdate);
      socket.off("game-started", handleUpdate);
      socket.off("picks-submitted", handleUpdate);
      socket.off("winner-updated", handleUpdate);
    };
  }, [socket, gameCode]);
}
