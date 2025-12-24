import { Socket } from "socket.io-client";
import { Device, types } from "mediasoup-client";

const createProducerTransport = (
  socket: Socket,
  device: Device
): Promise<types.Transport> =>
  new Promise(async (resolve, reject) => {
    try {
      // Ask the server to make a transport and send params
      const producerTransportParams = await socket.emitWithAck(
        "requestTransport",
        { type: "producer" }
      );

      // Use the device to create a front-end transport to send
      const producerTransport = device.createSendTransport(
        producerTransportParams
      );

      producerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          console.log("Connect running on produce...");
          const connectResp = await socket.emitWithAck("connectTransport", {
            dtlsParameters,
            type: "producer",
          });
          console.log(connectResp, "connectResp is back");

          if (connectResp === "success") {
            callback();
          } else {
            errback(new Error("Connection failed"));
          }
        }
      );

      producerTransport.on("produce", async (parameters, callback, errback) => {
        console.log("Produce event is now running");
        const { kind, rtpParameters } = parameters;
        const produceResp = await socket.emitWithAck("startProducing", {
          kind,
          rtpParameters,
        });
        console.log(produceResp, "produceResp is back!");

        if (produceResp === "error") {
          errback(new Error("Produce failed"));
        } else {
          callback({ id: produceResp });
        }
      });

      resolve(producerTransport);
    } catch (error) {
      reject(error);
    }
  });

export default createProducerTransport;
