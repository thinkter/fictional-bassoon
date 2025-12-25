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
    [key: string]: RemoteStream;
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
      const newStreams: { [key: string]: RemoteStream } = {};

      newListOfActives.forEach((aid) => {
        if (aid !== audioProducerRef.current?.id) {
          const consumerData = consumersRef.current[aid];
          if (consumerData) {
            newStreams[aid] = {
              stream: consumerData.combinedStream,
              userName: consumerData.userName,
            };
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
        (slot, stream, name, audioPid) => {
          setRemoteStreams((prev) => ({
            ...prev,
            [audioPid]: { stream, userName: name },
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
      (slot, stream, name, audioPid) => {
        setRemoteStreams((prev) => ({
          ...prev,
          [audioPid]: { stream, userName: name },
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

  const getParticipants = () => {
    const participants = [];
    if (localStream) {
      participants.push({
        stream: localStream,
        userName: `${userName} (You)`,
        isLocal: true,
        key: "local",
      });
    }
    Object.entries(remoteStreams).forEach(([key, remote]) => {
      participants.push({
        stream: remote.stream,
        userName: remote.userName,
        isLocal: false,
        key: `remote-${key}`,
      });
    });
    return participants;
  };

  const participants = getParticipants();

  // Dynamic grid column calculation could be added here,
  // but CSS grid with auto-fit is a good start for "simple implementation".

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-800 shadow-md z-10">
        <h1 className="text-xl font-bold">
          Room: <span className="text-indigo-400">{roomName}</span>
        </h1>
        <div className="flex gap-2">
          {/* Controls Control */}
          {!isJoined && (
            <button
              onClick={joinRoom}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Join
            </button>
          )}
          <button
            onClick={enableFeed}
            disabled={!isJoined || feedEnabled}
            className="px-3 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Camera On
          </button>
          <button
            onClick={sendFeed}
            disabled={!feedEnabled || feedSent}
            className="px-3 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Join Stream
          </button>
          <button
            onClick={toggleMute}
            disabled={!feedSent}
            className={`px-3 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
              isMuted
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
          <button
            disabled
            className="px-3 py-2 bg-red-600 rounded-lg opacity-50 cursor-not-allowed font-medium text-sm"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-xl mb-2">No one is here yet.</p>
              {!isJoined && <p>Join the room to start!</p>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr h-full max-h-full">
            {participants.map((p) => (
              <div key={p.key} className="relative w-full h-full min-h-[200px]">
                <div className="w-full h-full">
                  <VideoFeed
                    stream={p.stream}
                    userName={p.userName}
                    isLocal={p.isLocal}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
