import { Socket } from "socket.io-client";
import { Device, types } from "mediasoup-client";
import createConsumer from "./createConsumer";
import createConsumerTransport from "./createConsumerTransport";

export interface ConsumerData {
  combinedStream: MediaStream;
  userName: string;
  consumerTransport: types.Transport;
  audioConsumer?: types.Consumer;
  videoConsumer?: types.Consumer;
}

interface ConsumeData {
  audioPidsToCreate: string[];
  videoPidsToCreate: string[];
  associatedUserNames: string[];
}

const requestTransportToConsume = (
  consumeData: ConsumeData,
  socket: Socket,
  device: Device,
  consumers: Record<string, ConsumerData>,
  onNewConsumer: (
    slot: number,
    stream: MediaStream,
    userName: string,
    audioPid: string
  ) => void
) => {
  consumeData.audioPidsToCreate.forEach(async (audioPid: string, i: number) => {
    const videoPid = consumeData.videoPidsToCreate[i];

    // Expecting back transport params for THIS audioPid
    const consumerTransportParams = await socket.emitWithAck(
      "requestTransport",
      { type: "consumer", audioPid }
    );
    console.log(consumerTransportParams);

    const consumerTransport = createConsumerTransport(
      consumerTransportParams,
      device,
      socket,
      audioPid
    );

    // Create both audio and video consumers in parallel
    const [audioConsumer, videoConsumer] = await Promise.all([
      createConsumer(consumerTransport, audioPid, device, socket, "audio", i),
      createConsumer(consumerTransport, videoPid, device, socket, "video", i),
    ]);

    console.log(audioConsumer);
    console.log(videoConsumer);

    // Create a new MediaStream on the client with both tracks
    const tracks: MediaStreamTrack[] = [];
    if (audioConsumer?.track) tracks.push(audioConsumer.track);
    if (videoConsumer?.track) tracks.push(videoConsumer.track);

    const combinedStream = new MediaStream(tracks);
    console.log("Hope this works...");
    console.log(
      `Combined stream created with ${combinedStream.getTracks().length} tracks`
    );

    // Update state via callback
    onNewConsumer(
      i,
      combinedStream,
      consumeData.associatedUserNames[i],
      audioPid
    );

    // Store in consumers object (keyed by audio PID)
    consumers[audioPid] = {
      combinedStream,
      userName: consumeData.associatedUserNames[i],
      consumerTransport,
      audioConsumer,
      videoConsumer,
    };
  });
};

export default requestTransportToConsume;
