"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Hand,
  MessageSquare,
  Users,
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  Send,
  Radio,
  X,
} from "lucide-react";
import { Channel, User } from "@/lib/api-client";
import { getSocket } from "@/lib/socket";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
}

interface TeamMeetingRoomProps {
  isOpen: boolean;
  channel: Channel;
  currentUser: User | null;
  onClose: () => void;
}

export const TeamMeetingRoom: React.FC<TeamMeetingRoomProps> = ({
  isOpen,
  channel,
  currentUser,
  onClose,
}) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<"chat" | "participants" | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [meetingMessages, setMeetingMessages] = useState<
    { sender: string; text: string; time: string }[]
  >([
    {
      sender: "System",
      text: "Team Meeting started. Audio & Video channels active.",
      time: "Just now",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initial Demo Participants
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: currentUser?.id || "me",
      name: currentUser?.name || "Alex Rivera (You)",
      avatar: currentUser?.avatar,
      isMuted: false,
      isCameraOn: true,
      isScreenSharing: false,
      isHandRaised: false,
      isSpeaking: true,
    },
    {
      id: "alice-1",
      name: "Alice Chen (Product)",
      isMuted: false,
      isCameraOn: true,
      isScreenSharing: false,
      isHandRaised: false,
      isSpeaking: false,
    },
    {
      id: "bob-2",
      name: "Bob Vance (Dev)",
      isMuted: true,
      isCameraOn: false,
      isScreenSharing: false,
      isHandRaised: true,
      isSpeaking: false,
    },
  ]);

  // Timer Clock
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Webcam stream initialization
  useEffect(() => {
    if (!isOpen) return;

    if (isCameraOn && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.log("Webcam preview not available or permission denied:", err);
        });
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [isOpen, isCameraOn]);

  // Socket meeting sync
  useEffect(() => {
    if (!isOpen) return;
    const socket = getSocket();

    socket.emit("join_meeting", {
      channelId: channel.id,
      user: { id: currentUser?.id, name: currentUser?.name },
    });

    const handleUserAction = (data: any) => {
      if (data.channelId === channel.id) {
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.id === data.userId) {
              if (data.action === "mic") return { ...p, isMuted: !data.state };
              if (data.action === "cam") return { ...p, isCameraOn: data.state };
              if (data.action === "screen") return { ...p, isScreenSharing: data.state };
              if (data.action === "hand") return { ...p, isHandRaised: data.state };
            }
            return p;
          })
        );
      }
    };

    socket.on("meeting_user_action", handleUserAction);

    return () => {
      socket.emit("leave_meeting", {
        channelId: channel.id,
        user: { id: currentUser?.id, name: currentUser?.name },
      });
      socket.off("meeting_user_action", handleUserAction);
    };
  }, [isOpen, channel.id, currentUser]);

  const toggleMic = () => {
    const next = !isMicOn;
    setIsMicOn(next);
    const socket = getSocket();
    socket.emit("meeting_action", {
      channelId: channel.id,
      userId: currentUser?.id,
      action: "mic",
      state: next,
    });
    setParticipants((prev) =>
      prev.map((p) => (p.id === currentUser?.id ? { ...p, isMuted: !next } : p))
    );
  };

  const toggleCamera = () => {
    const next = !isCameraOn;
    setIsCameraOn(next);
    const socket = getSocket();
    socket.emit("meeting_action", {
      channelId: channel.id,
      userId: currentUser?.id,
      action: "cam",
      state: next,
    });
    setParticipants((prev) =>
      prev.map((p) => (p.id === currentUser?.id ? { ...p, isCameraOn: next } : p))
    );
  };

  const toggleScreenShare = () => {
    const next = !isScreenSharing;
    setIsScreenSharing(next);
    const socket = getSocket();
    socket.emit("meeting_action", {
      channelId: channel.id,
      userId: currentUser?.id,
      action: "screen",
      state: next,
    });
  };

  const toggleHand = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    const socket = getSocket();
    socket.emit("meeting_action", {
      channelId: channel.id,
      userId: currentUser?.id,
      action: "hand",
      state: next,
    });
    setParticipants((prev) =>
      prev.map((p) => (p.id === currentUser?.id ? { ...p, isHandRaised: next } : p))
    );
  };

  const handleSendMeetingChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMeetingMessages((prev) => [
      ...prev,
      {
        sender: currentUser?.name || "You",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setChatInput("");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0F172A] text-slate-100 backdrop-blur-2xl">
      {/* Top Meeting Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <Radio className="h-3.5 w-3.5" />
            <span>LIVE MEETING</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <h2 className="text-sm font-semibold text-slate-200">
            #{channel.name} Call
          </h2>

          <span className="font-mono text-xs text-slate-400">
            {formatTime(durationSeconds)}
          </span>
        </div>

        {/* Right Header Status */}
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
            👥 {participants.length} connected
          </span>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Center Meeting Stage */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Video & Screen Grid */}
        <div className="flex flex-1 flex-col p-6 overflow-y-auto">
          {/* If Screen Sharing is active */}
          {isScreenSharing ? (
            <div className="flex flex-1 flex-col gap-4">
              <div className="relative flex flex-1 items-center justify-center rounded-3xl border border-[#A3B899]/40 bg-slate-950 p-6 shadow-2xl overflow-hidden">
                <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-[#A3B899] backdrop-blur-md">
                  <ScreenShare className="h-3.5 w-3.5" />
                  <span>{currentUser?.name || "You"} is sharing screen</span>
                </div>

                {/* Simulated Shared Screen Dashboard / Code */}
                <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="font-mono text-xs text-slate-400">
                      ⚡ ChaosNote_Teams_Architecture_Review.ts
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">
                      Live Stream
                    </span>
                  </div>
                  <pre className="mt-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
{`// ChaosNote Real-Time WebSocket & RBAC Gateway
export class TeamGateway {
  @SubscribeMessage("meeting_signal")
  handleWebRTC(data: StreamPayload) {
    this.server.to(channelId).emit("audio_video_sync", data);
  }
}
// Soft-Skill Organic Mesh Gradient: #A3B899 + #778A9B + #FAF8F5`}
                  </pre>
                </div>
              </div>

              {/* Bottom Thumbnails Strip */}
              <div className="flex h-28 gap-3 overflow-x-auto pb-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="relative flex h-full w-40 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A3B899]/30 text-xs font-bold text-[#A3B899]">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute bottom-2 left-2 truncate text-[10px] font-medium text-slate-300">
                      {p.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 2x2 or 3x3 Dynamic Video Tile Grid */
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {participants.map((p) => {
                const isMe = p.id === currentUser?.id || p.id === "me";

                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col items-center justify-center rounded-3xl border bg-slate-900/90 p-4 shadow-xl transition-all ${
                      p.isSpeaking
                        ? "border-[#A3B899] ring-2 ring-[#A3B899]/30"
                        : "border-slate-800"
                    }`}
                  >
                    {/* Live Video Feed or Custom Avatar */}
                    {isMe && isCameraOn ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div
                          className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold transition-transform ${
                            p.isSpeaking
                              ? "scale-110 bg-[#6F8863] text-white shadow-lg shadow-[#6F8863]/30"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Speaking Wave Bars */}
                        {p.isSpeaking && (
                          <div className="flex items-center gap-1">
                            <span className="h-3 w-1 rounded-full bg-[#A3B899] animate-bounce" />
                            <span className="h-5 w-1 rounded-full bg-[#A3B899] animate-bounce [animation-delay:0.2s]" />
                            <span className="h-2 w-1 rounded-full bg-[#A3B899] animate-bounce [animation-delay:0.4s]" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Participant Info Tag */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md">
                      <span className="truncate max-w-[140px] font-medium">
                        {p.name}
                      </span>
                      {p.isMuted ? (
                        <MicOff className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <Mic className="h-3.5 w-3.5 text-[#A3B899]" />
                      )}
                    </div>

                    {/* Hand Raised Badge */}
                    {p.isHandRaised && (
                      <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md animate-bounce">
                        <Hand className="h-3.5 w-3.5" />
                        <span>Hand Raised</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side Panel: In-Call Chat or Participants Roster */}
        {activeSidePanel && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/95 p-4 backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">
                {activeSidePanel === "chat" ? "Meeting Chat" : "Meeting Participants"}
              </h3>
              <button
                onClick={() => setActiveSidePanel(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeSidePanel === "chat" ? (
              <div className="flex flex-1 flex-col justify-between pt-3">
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                  {meetingMessages.map((m, idx) => (
                    <div key={idx} className="rounded-xl bg-slate-800/70 p-2.5 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-300">
                        <span>{m.sender}</span>
                        <span className="text-[10px] text-slate-500">{m.time}</span>
                      </div>
                      <p className="mt-1 text-slate-200">{m.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMeetingChat} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Send in meeting..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#A3B899]"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#6F8863] px-3 py-2 text-white hover:bg-[#5E7653]"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5 overflow-y-auto">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-slate-800/60 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A3B899]/30 font-bold text-[#A3B899]">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate font-medium text-slate-200">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      {p.isMuted ? (
                        <MicOff className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <Mic className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      {p.isCameraOn ? (
                        <Video className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <VideoOff className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="flex h-20 items-center justify-center gap-3 border-t border-slate-800/80 bg-slate-900/90 px-6 backdrop-blur-md">
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-md ${
            isMicOn
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
              : "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
          }`}
          title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-md ${
            isCameraOn
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
              : "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
          }`}
          title={isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
        >
          {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-md ${
            isScreenSharing
              ? "bg-[#6F8863] text-white shadow-lg shadow-[#6F8863]/30"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
          title="Share Screen"
        >
          <ScreenShare className="h-5 w-5" />
        </button>

        {/* Raise Hand Toggle */}
        <button
          onClick={toggleHand}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-md ${
            isHandRaised
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
          title="Raise Hand"
        >
          <Hand className="h-5 w-5" />
        </button>

        <div className="h-8 w-px bg-slate-800" />

        {/* Toggle Chat Drawer */}
        <button
          onClick={() =>
            setActiveSidePanel(activeSidePanel === "chat" ? null : "chat")
          }
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-md ${
            activeSidePanel === "chat"
              ? "bg-[#A3B899]/30 text-[#A3B899]"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
          title="Meeting Chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        {/* Toggle Participants Drawer */}
        <button
          onClick={() =>
            setActiveSidePanel(activeSidePanel === "participants" ? null : "participants")
          }
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-md ${
            activeSidePanel === "participants"
              ? "bg-[#A3B899]/30 text-[#A3B899]"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
          title="Participants Roster"
        >
          <Users className="h-5 w-5" />
        </button>

        {/* End Call / Leave Meeting */}
        <button
          onClick={onClose}
          className="flex h-12 items-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all ml-2"
        >
          <PhoneOff className="h-5 w-5" />
          <span>Leave Call</span>
        </button>
      </div>
    </div>
  );
};
