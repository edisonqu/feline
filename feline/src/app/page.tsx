'use client'

import React, { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [speechText, setSpeechText] = useState("");
  const mqttClientRef = useRef<any>(null);
  const keyStateRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  const sendVelocity = (linear: number, angular: number) => {
    if (!mqttClientRef.current) return;
    const payload = JSON.stringify({ linear, angular });
    mqttClientRef.current.publish("robot/velocity", payload);
  };

  const updateVelocity = () => {
    const { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } = keyStateRef.current;
    let linear = 0;
    if (ArrowUp) linear += 0.35;
    if (ArrowDown) linear -= 0.35;
    let angular = 0;
    if (ArrowLeft) angular -= 1.0;
    if (ArrowRight) angular += 1.0;
    sendVelocity(linear, angular);
  };

  const sendSpeech = () => {
    if (!mqttClientRef.current) return;
    mqttClientRef.current.publish("robot/speak", speechText);
    setSpeechText("");
  };

  useEffect(() => {
    const hostname = window.location.hostname;
    const username = hostname.split("-")[0];
    const mqttHost = username.includes(".") ? hostname : `${username}-desktop.local`;

    const client = mqtt.connect(`ws://${mqttHost}:9001`);
    mqttClientRef.current = client;

    client.on("connect", () => {
      setConnectionStatus("Connected");
    });

    client.on("error", (error) => {
      setConnectionStatus(`Connection failed: ${error}`);
    });

    client.on("message", (topic: string, message: Buffer) => {
      console.log("Message received:", message.toString());
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (keyStateRef.current.hasOwnProperty(event.key)) {
        keyStateRef.current[event.key as keyof typeof keyStateRef.current] = true;
        updateVelocity();
      } else if (event.key === " ") {
        Object.keys(keyStateRef.current).forEach(
          (key) => (keyStateRef.current[key as keyof typeof keyStateRef.current] = false)
        );
        sendVelocity(0, 0);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (keyStateRef.current.hasOwnProperty(event.key)) {
        keyStateRef.current[event.key as keyof typeof keyStateRef.current] = false;
        updateVelocity();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (client) {
        client.end();
      }
    };
  }, []);

  return (
    <div className="min-h-screen p-8 pb-20 flex flex-col items-center justify-center gap-8 font-sans">
      <div className="w-full max-w-2xl text-center">
        <h2 className="text-2xl font-bold mb-6">Robot Controller</h2>
        
        <div className={`text-lg font-medium mb-8 ${
          connectionStatus.startsWith("Connected") ? "text-green-600" : "text-red-600"
        }`}>
          {connectionStatus}
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto mb-8">
          <button
            className="w-20 h-20 bg-gray-100 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation select-none"
            onTouchStart={() => sendVelocity(0.35, -1.0)}
            onTouchEnd={() => sendVelocity(0, 0)}
          >↖</button>
          <button
            className="w-20 h-20 bg-gray-100 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation select-none"
            onTouchStart={() => sendVelocity(0.35, 0)}
            onTouchEnd={() => sendVelocity(0, 0)}
          >↑</button>
          <button
            className="w-20 h-20 bg-gray-100 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation select-none"
            onTouchStart={() => sendVelocity(0.35, 1.0)}
            onTouchEnd={() => sendVelocity(0, 0)}
          >↗</button>
          <button
            className="w-20 h-20 bg-gray-100 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation select-none"
            onTouchStart={() => sendVelocity(0, -1.0)}
            onTouchEnd={() => sendVelocity(0, 0)}
          >←</button>
          <button
            className="w-20 h-20 bg-gray-100 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation select-none"
            onTouchStart={() => sendVelocity(0, 0)}
            onTouchEnd={() => sendVelocity(0, 0)}
          >⊕</button>
          <button
            className="w-20 h-20 bg-gray-100 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation select-none"
            onTouchStart={() => sendVelocity(0, 1.0)}
            onTouchEnd={() => sendVelocity(0, 0)}
          >→</button>
          <button
            className="w-20 h-20 bg-gray-100 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation select-none"
            onTouchStart={() => sendVelocity(-0.35, -1.0)}
            onTouchEnd={() => sendVelocity(0, 0)}
          >↙</button>
          <button
            className="w-20 h-20 bg-gray-100 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation select-none"
            onTouchStart={() => sendVelocity(-0.35, 0)}
            onTouchEnd={() => sendVelocity(0, 0)}
          >↓</button>
          <button
            className="w-20 h-20 bg-gray-100 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation select-none"
            onTouchStart={() => sendVelocity(-0.35, 1.0)}
            onTouchEnd={() => sendVelocity(0, 0)}
          >↘</button>
        </div>

        <div className="flex gap-4 justify-center items-center">
          <input
            type="text"
            id="speechText"
            placeholder="Enter text to speak"
            value={speechText}
            onChange={(e) => setSpeechText(e.target.value)}
            className="px-4 py-2 border rounded-lg text-base w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendSpeech}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Speak
          </button>
        </div>
      </div>
    </div>
  );
}
