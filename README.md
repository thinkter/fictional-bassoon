# Mediasoup Meeting Client

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![WebRTC](https://img.shields.io/badge/media-WebRTC-333333?logo=webrtc&logoColor=white)
![Socket.IO](https://img.shields.io/badge/signaling-Socket.IO-010101?logo=socketdotio&logoColor=white)

A Next.js meeting-room client for a Mediasoup-based selective forwarding unit (SFU).

</div>

```mermaid
sequenceDiagram
  participant B as Browser
  participant S as Socket.IO signaling server
  participant M as Mediasoup SFU

  B->>S: Join room
  S-->>B: Router RTP capabilities
  B->>S: Create producer transport
  B->>M: Publish camera and microphone
  S-->>B: Producers available
  B->>S: Create consumer transport
  M-->>B: Receive remote media
```

## Features

- Join a named meeting room.
- Publish microphone and camera tracks through a Mediasoup producer transport.
- Consume remote audio/video through consumer transports.
- Track active speakers and newly available producers over Socket.IO.
- Mute/unmute local audio and render participant feeds.

## Setup

```bash
npm install
```

Create `.env.local`:

```dotenv
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

Point the value at a compatible signaling server that implements the Socket.IO events used in `lib/mediasoup/`.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a name and room, and allow camera/microphone access.

## Scope

This repository is the browser client only. It requires a separate Mediasoup worker/signaling backend and secure HTTPS/WSS deployment for production use.
