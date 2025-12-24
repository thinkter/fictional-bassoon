"use client";

import { useSearchParams } from "next/navigation";
import { use } from "react";
import MeetingRoom from "@/components/MeetingRoom";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const userName = searchParams.get("userName") || "Anonymous";
  const roomName = resolvedParams.roomId;

  return <MeetingRoom userName={userName} roomName={roomName} />;
}
