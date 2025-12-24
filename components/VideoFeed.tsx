"use client";

import { useEffect, useRef } from "react";

interface VideoFeedProps {
  stream: MediaStream;
  userName?: string;
  isLocal?: boolean;
}

export default function VideoFeed({
  stream,
  userName,
  isLocal = false,
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    console.log(
      `Setting srcObject for ${isLocal ? "local" : "remote"} stream:`,
      stream.id
    );

    // Debug: Log stream tracks
    const tracks = stream.getTracks();
    console.log(`Stream has ${tracks.length} tracks:`);
    tracks.forEach((track) => {
      console.log(
        `  - ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}`
      );
    });

    // Set the stream
    video.srcObject = stream;

    // Explicitly try to play
    video
      .play()
      .then(() => {
        console.log(`Video playing for ${isLocal ? "local" : "remote"} stream`);
      })
      .catch((err) => {
        console.log(
          `Video play error for ${isLocal ? "local" : "remote"}:`,
          err.name,
          err.message
        );
      });
  }, [stream, isLocal]);

  return (
    <div
      className={`relative bg-gray-800 rounded-lg overflow-hidden aspect-video ${
        isLocal ? "border-2 border-green-500" : "border border-gray-600"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />
      {userName && (
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-sm text-white">
          {isLocal ? `You (${userName})` : userName}
        </div>
      )}
    </div>
  );
}
