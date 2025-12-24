"use client";

import { useEffect, useRef, useState } from "react";
import { Device, types } from "mediasoup-client";
import { getSocket } from "@/lib/socket";
import {
  createProducerTransport,
  createProducer,
  requestTransportToConsume,
  ConsumerData,
} from "@/lib/mediasoup";
import VideoFeed from "./VideoFeed";

interface MeetingRoomProps {
  userName: string;
  roomName: string;
}

interface RemoteStream {
  stream: MediaStream;
  userName: string;
}

export default function MeetingRoom({ userName, roomName }: MeetingRoomProps) {
  const socket = getSocket();
  const [device, setDevice] = useState<Device | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{
    [key: number]: RemoteStream;
  }>({});
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [feedEnabled, setFeedEnabled] = useState(false);
  const [feedSent, setFeedSent] = useState(false);

  // Refs for persistence
  const consumersRef = useRef<Record<string, ConsumerData>>({});
  const audioProducerRef = useRef<types.Producer | null>(null);
  const videoProducerRef = useRef<types.Producer | null>(null);
  const producerTransportRef = useRef<types.Transport | null>(null);
  const deviceRef = useRef<Device | null>(null);

  // Keep deviceRef in sync with device state
  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

  useEffect(() => {
    // Socket listeners
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("updateActiveSpeakers", (newListOfActives: string[]) => {
      console.log("updateActiveSpeakers:", newListOfActives);
      const newStreams: { [key: number]: RemoteStream } = {};
      let slot = 0;

      newListOfActives.forEach((aid) => {
        if (aid !== audioProducerRef.current?.id) {
          const consumerData = consumersRef.current[aid];
          if (consumerData) {
            newStreams[slot] = {
              stream: consumerData.combinedStream,
              userName: consumerData.userName,
            };
            slot++;
          }
        }
      });
      setRemoteStreams(newStreams);
    });

    socket.on("newProducersToConsume", (consumeData) => {
      const currentDevice = deviceRef.current;
      if (!currentDevice) {
        console.warn("newProducersToConsume: device not ready yet");
        return;
      }
      requestTransportToConsume(
        consumeData,
        socket,
        currentDevice,
        consumersRef.current,
        (slot, stream, name) => {
          setRemoteStreams((prev) => ({
            ...prev,
            [slot]: { stream, userName: name },
          }));
        }
      );
    });

    return () => {
      socket.off("connect");
      socket.off("updateActiveSpeakers");
      socket.off("newProducersToConsume");
    };
  }, [socket]);

  const joinRoom = async () => {
    const joinRoomResp = await socket.emitWithAck("joinRoom", {
      userName,
      roomName,
    });
    console.log("joinRoomResp:", joinRoomResp);

    const newDevice = new Device();
    await newDevice.load({
      routerRtpCapabilities: joinRoomResp.routerRtpCapabilities,
    });
    setDevice(newDevice);
    setIsJoined(true);

    // Initial consumption if any existing producers
    requestTransportToConsume(
      joinRoomResp,
      socket,
      newDevice,
      consumersRef.current,
      (slot, stream, name) => {
        setRemoteStreams((prev) => ({
          ...prev,
          [slot]: { stream, userName: name },
        }));
      }
    );
  };

  const enableFeed = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      setFeedEnabled(true);
    } catch (err) {
      console.error("Error enabling feed:", err);
    }
  };

  const sendFeed = async () => {
    if (!device || !localStream) return;

    try {
      const transport = await createProducerTransport(socket, device);
      producerTransportRef.current = transport;

      const { audioProducer, videoProducer } = await createProducer(
        localStream,
        transport
      );
      audioProducerRef.current = audioProducer;
      videoProducerRef.current = videoProducer;
      setFeedSent(true);
    } catch (err) {
      console.error("Error sending feed:", err);
    }
  };

  const toggleMute = () => {
    const audioProducer = audioProducerRef.current;
    if (!audioProducer) return;

    if (audioProducer.paused) {
      audioProducer.resume();
      socket.emit("audioChange", "unmute");
      setIsMuted(false);
    } else {
      audioProducer.pause();
      socket.emit("audioChange", "mute");
      setIsMuted(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-2">
        <h1 className="text-xl font-bold">
          Room: <span className="text-indigo-400">{roomName}</span> | User:{" "}
          <span className="text-green-400">{userName}</span>
        </h1>
        <div className="flex gap-2">
          {!isJoined && (
            <button
              onClick={joinRoom}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Join Room
            </button>
          )}
          <button
            onClick={enableFeed}
            disabled={!isJoined || feedEnabled}
            className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Feed On
          </button>
          <button
            onClick={sendFeed}
            disabled={!feedEnabled || feedSent}
            className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Feed
          </button>
          <button
            onClick={toggleMute}
            disabled={!feedSent}
            className={`px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              isMuted
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isMuted ? "Audio Muted" : "Audio On"}
          </button>
          <button
            disabled
            className="px-4 py-2 bg-red-600 rounded-lg opacity-50 cursor-not-allowed font-medium"
          >
            Hangup
          </button>
        </div>
      </div>

      {/* Remote Videos - Small thumbnails at top */}
      <div className="flex gap-2 mb-4 justify-center">
        {[1, 2, 3, 4].map((slot) => {
          const remote = remoteStreams[slot];
          return (
            <div key={slot} className="w-[18%] h-20">
              {remote ? (
                <VideoFeed stream={remote.stream} userName={remote.userName} />
              ) : (
                <div className="w-full h-full bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center text-gray-500 text-xs">
                  Empty
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Speaker Video */}
      <div className="flex-1 flex justify-center mb-4">
        <div className="w-[80%] max-w-4xl">
          {remoteStreams[0] ? (
            <VideoFeed
              stream={remoteStreams[0].stream}
              userName={remoteStreams[0].userName}
            />
          ) : (
            <div className="w-full aspect-video bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center text-gray-500">
              {isJoined
                ? "Waiting for other participants..."
                : "Join the room to start"}
            </div>
          )}
        </div>
      </div>

      {/* Local Video - Bottom left */}
      <div className="absolute bottom-6 left-6 w-40">
        {localStream ? (
          <VideoFeed stream={localStream} userName={userName} isLocal />
        ) : (
          <div className="w-full h-24 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center text-gray-500 text-xs">
            Camera Off
          </div>
        )}
      </div>
    </div>
  );
}
