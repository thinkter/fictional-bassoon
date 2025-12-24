import { types } from "mediasoup-client";

interface ProducerResult {
  audioProducer: types.Producer;
  videoProducer: types.Producer;
}

const createProducer = (
  localStream: MediaStream,
  producerTransport: types.Transport
): Promise<ProducerResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get the audio and video tracks so we can produce
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];

      // Running the produce method will tell the transport connect event to fire
      console.log("Calling produce on video");
      const videoProducer = await producerTransport.produce({
        track: videoTrack,
      });

      console.log("Calling produce on audio");
      const audioProducer = await producerTransport.produce({
        track: audioTrack,
      });

      console.log("Finished producing!");
      resolve({ audioProducer, videoProducer });
    } catch (err) {
      console.log(err, "error producing");
      reject(err);
    }
  });
};

export default createProducer;
