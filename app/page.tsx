"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [roomName, setRoomName] = useState("");
  const [userName, setUserName] = useState("user");
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName || !userName) return;
    router.push(`/room/${roomName}?userName=${encodeURIComponent(userName)}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex mb-8">
        <h1 className="text-4xl font-bold mx-auto bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          Video Call App
        </h1>
      </div>

      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <form onSubmit={handleJoin} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-2 text-gray-300"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white placeholder-gray-400"
              placeholder="Enter your name"
              required
            />
          </div>
          <div>
            <label
              htmlFor="room"
              className="block text-sm font-medium mb-2 text-gray-300"
            >
              Room Name
            </label>
            <input
              id="room"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white placeholder-gray-400"
              placeholder="Enter room name"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg font-bold text-white transition-all duration-200 mt-2 shadow-lg hover:shadow-indigo-500/25"
          >
            Join Room
          </button>
        </form>
      </div>
    </main>
  );
}
