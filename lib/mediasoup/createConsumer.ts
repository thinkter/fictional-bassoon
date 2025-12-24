import { Socket } from "socket.io-client";
import { Device, types } from "mediasoup-client";

const createConsumer = (
  consumerTransport: types.Transport,
  pid: string,
  device: Device,
  socket: Socket,
  kind: "audio" | "video",
  slot: number
): Promise<types.Consumer | undefined> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Emit the consumeMedia event to get params back
      const consumerParams = await socket.emitWithAck("consumeMedia", {
        rtpCapabilities: device.rtpCapabilities,
        pid,
        kind,
      });

      console.log(consumerParams);

      if (consumerParams === "cannotConsume") {
        console.log("Cannot consume");
        resolve(undefined);
        return;
      }

      if (consumerParams === "consumeFailed") {
        console.log("Consume failed...");
        resolve(undefined);
        return;
      }

      // We got valid params! Use them to consume
      const consumer = await consumerTransport.consume(consumerParams);
      console.log("consume() has finished");

      // Unpause the consumer
      await socket.emitWithAck("unpauseConsumer", { pid, kind });
      resolve(consumer);
    } catch (err) {
      console.log(err, "error in createConsumer");
      reject(err);
    }
  });
};

export default createConsumer;
