'use client'

import React, { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

type GridData = {
flattened_grid_list: number[];
width: number;
}

type RobotPose = {
x_grid: number;
y_grid: number;
}

export default function GridControl() {
const [connectionStatus, setConnectionStatus] = useState("Disconnected");
const [speechText, setSpeechText] = useState("");
const [gridData, setGridData] = useState<GridData | null>(null);
const [robotPose, setRobotPose] = useState<RobotPose | null>(null);
const mqttClientRef = useRef<any>(null);
const lastUpdateTimeRef = useRef(0);
const updateInterval = 5000;

const publishVelocity = (linear: number, angular: number) => {
    if (!mqttClientRef.current) return;
    const payload = JSON.stringify({
    timestamp: Date.now(),
    linear_velocity_mps: linear,
    angular_velocity_radps: angular
    });
    mqttClientRef.current.publish("/control/target_velocity", payload);
};

const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    switch (key) {
    case 'w':
        publishVelocity(0.5, 0.0);
        break;
    case 's':
        publishVelocity(-0.5, 0.0);
        break;
    case 'a':
        publishVelocity(0.0, 45.0);
        break;
    case 'd':
        publishVelocity(0.0, -45.0);
        break;
    case 'q':
        publishVelocity(0.0, 0.0);
        break;
    }
};

const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
    publishVelocity(0.0, 0.0);
    }
};

const sendSpeech = () => {
    if (!mqttClientRef.current) return;
    mqttClientRef.current.publish("robot/speak", speechText);
    setSpeechText("");
};

useEffect(() => {
    const hostname = window.location.hostname;
    const username = hostname.split("-")[0];
    const mqttHost = username.includes(".") ? hostname : `${username}-bracketbot.local`;

    const client = mqtt.connect(`ws://${mqttHost}:9001`);
    mqttClientRef.current = client;

    client.on("connect", () => {
    setConnectionStatus("Connected");
    client.subscribe('/mapping/traversability_grid');
    client.subscribe('/mapping/robot_pose_grid_coords');
    });

    client.on("error", (error) => {
    setConnectionStatus(`Connection failed: ${error}`);
    });

    client.on("message", (topic: string, message: Buffer) => {
    if (topic === '/mapping/traversability_grid') {
        const currentTime = Date.now();
        if (currentTime - lastUpdateTimeRef.current >= updateInterval) {
        const data = JSON.parse(message.toString());
        setGridData(data);
        lastUpdateTimeRef.current = currentTime;
        }
    } else if (topic === '/mapping/robot_pose_grid_coords') {
        setRobotPose(JSON.parse(message.toString()));
    }
    });

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

const renderGrid = () => {
    if (!gridData) return null;

    const rows = [];
    const { flattened_grid_list, width } = gridData;

    for (let i = width - 10; i >= 0; i -= 10) {
    const cells = [];
    for (let j = 0; j < width; j += 10) {
        const value = flattened_grid_list[i * width + j];
        const isRobot = robotPose && 
        Math.abs(i - robotPose.y_grid) < 5 && 
        Math.abs(j - robotPose.x_grid) < 5;

        cells.push(
        <td
            key={`${i}-${j}`}
            className={`w-5 h-5 border border-black ${
            isRobot ? 'bg-red-500' : value ? 'bg-black' : 'bg-white'
            }`}
        />
        );
    }
    rows.push(<tr key={i}>{cells}</tr>);
    }

    return (
    <table className="border-collapse grid-table">
        <tbody>{rows}</tbody>
    </table>
    );
};

return (
    <div className="min-h-screen overflow-hidden p-8 pb-20 flex flex-col items-center justify-center gap-8 font-sans">
    <div className="w-full max-w-2xl text-center">
        <h2 className="text-2xl font-bold mb-6">Grid Control Interface</h2>
        
        <div className={`text-lg font-medium mb-8 ${
        connectionStatus.startsWith("Connected") ? "text-green-600" : "text-red-600"
        }`}>
        {connectionStatus}
        </div>

        <div className="mb-8 text-left">
        <p className="text-gray-700">
            Use <b>W</b>, <b>A</b>, <b>S</b>, <b>D</b> to move/turn.<br />
            Press <b>Q</b> to stop movement.<br />
            Releasing any key also stops the robot.
        </p>
        </div>

        <div className="flex gap-4 justify-center items-center mb-8">
        <input
            type="text"
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

        <div className="grid-container relative">
        {renderGrid()}
        </div>
    </div>
    </div>
);
}

