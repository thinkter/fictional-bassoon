import { Socket } from "socket.io-client";
import { Device, types } from "mediasoup-client";

const createConsumerTransport = (
  transportParams: any,
  device: Device,
  socket: Socket,
  audioPid: string
): types.Transport => {
  // Make a downstream transport for ONE producer/peer/client
  const consumerTransport = device.createRecvTransport(transportParams);

  consumerTransport.on("connectionstatechange", (state) => {
    console.log("==connectionstatechange==", state);
  });

  consumerTransport.on("icegatheringstatechange", (state) => {
    console.log("==icegatheringstatechange==", state);
  });

  // Transport connect listener - fires on .consume()
  consumerTransport.on(
    "connect",
    async ({ dtlsParameters }, callback, errback) => {
      console.log("Transport connect event has fired!");

      const connectResp = await socket.emitWithAck("connectTransport", {
        dtlsParameters,
        type: "consumer",
        audioPid,
      });

      console.log(connectResp, "connectResp is back!");

      if (connectResp === "success") {
        callback();
      } else {
        errback(new Error("Connection failed"));
      }
    }
  );

  return consumerTransport;
};

export default createConsumerTransport;
