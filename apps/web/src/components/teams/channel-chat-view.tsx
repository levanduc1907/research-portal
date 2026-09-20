"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Hash,
  FileText,
  Download,
  Users,
  Sparkles,
  Video,
  PhoneCall,
  Radio,
} from "lucide-react";
import { Channel, Message, MessageAttachment, User, api } from "@/lib/api-client";
import { getSocket } from "@/lib/socket";
import { TeamMeetingRoom } from "./team-meeting-room";

interface ChannelChatViewProps {
  channel: Channel;
  currentUser: User | null;
  onOpenMembers: () => void;
}

export const ChannelChatView: React.FC<ChannelChatViewProps> = ({
  channel,
  currentUser,
  onOpenMembers,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [hasActiveMeeting, setHasActiveMeeting] = useState(false);
  const [meetingInitiator, setMeetingInitiator] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch message history
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    api
      .getMessages(channel.id)
      .then((data) => {
        if (isMounted) {
          setMessages(data);
          setIsLoading(false);
          setTimeout(scrollToBottom, 100);
        }
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [channel.id]);

  // 2. Setup Socket.io channel listeners
  useEffect(() => {
    const socket = getSocket();

    socket.emit("join_channel", {
      channelId: channel.id,
      user: currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
    });

    const handleNewMessage = (newMsg: Message) => {
      if (newMsg.channelId === channel.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 50);
      }
    };

    const handleTyping = (data: {
      channelId: string;
      user: { id: string; name: string };
      isTyping: boolean;
    }) => {
      if (data.channelId === channel.id && data.user.id !== currentUser?.id) {
        if (data.isTyping) {
          setTypingUsers((prev) =>
            prev.includes(data.user.name) ? prev : [...prev, data.user.name]
          );
        } else {
          setTypingUsers((prev) => prev.filter((name) => name !== data.user.name));
        }
      }
    };

    const handleMeetingStarted = (data: any) => {
      if (data.channelId === channel.id) {
        setHasActiveMeeting(true);
        setMeetingInitiator(data.initiator?.name || "Team Member");
      }
    };

    const handleMeetingEnded = (data: any) => {
      if (data.channelId === channel.id) {
        setHasActiveMeeting(false);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleTyping);
    socket.on("meeting_started", handleMeetingStarted);
    socket.on("meeting_ended", handleMeetingEnded);

    return () => {
      socket.emit("leave_channel", {
        channelId: channel.id,
        user: currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
      });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleTyping);
      socket.off("meeting_started", handleMeetingStarted);
      socket.off("meeting_ended", handleMeetingEnded);
    };
  }, [channel.id, currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Emit typing event
    const socket = getSocket();
    if (currentUser) {
      socket.emit("typing", {
        channelId: channel.id,
        user: { id: currentUser.id, name: currentUser.name },
        isTyping: true,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", {
          channelId: channel.id,
          user: { id: currentUser.id, name: currentUser.name },
          isTyping: false,
        });
      }, 2000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;

    const content = inputText.trim();
    const currentAttachments = [...attachments];
    setInputText("");
    setAttachments([]);
    setShowAttachMenu(false);

    try {
      await api.postMessage(channel.id, {
        content,
        attachments: currentAttachments,
      });
      // Message will be received via socket
    } catch (err) {
      console.error("Failed to post message:", err);
    }
  };

  const handleStartCall = () => {
    const socket = getSocket();
    socket.emit("start_meeting", {
      channelId: channel.id,
      teamId: channel.teamId,
      initiator: {
        id: currentUser?.id,
        name: currentUser?.name || "Alex Rivera",
        avatar: currentUser?.avatar,
      },
    });
    setHasActiveMeeting(true);
    setIsMeetingOpen(true);
  };

  const addSampleAttachment = (type: "doc" | "image" | "code") => {
    let sample: MessageAttachment;
    if (type === "doc") {
      sample = {
        name: "Sprint_44_Architecture_Specs.pdf",
        url: "https://example.com/docs/specs.pdf",
        size: "1.8 MB",
        type: "pdf",
      };
    } else if (type === "image") {
      sample = {
        name: "Soft_Skill_Mockup_v3.png",
        url: "https://example.com/images/mockup.png",
        size: "3.2 MB",
        type: "image",
      };
    } else {
      sample = {
        name: "Gateway_Service_Patch.ts",
        url: "https://example.com/code/gateway.ts",
        size: "24 KB",
        type: "code",
      };
    }
    setAttachments((prev) => [...prev, sample]);
    setShowAttachMenu(false);
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
      {/* Channel Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/60 px-6 py-3.5 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A3B899]/25 text-[#425739] dark:bg-[#A3B899]/20 dark:text-[#A3B899]">
            <Hash className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {channel.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {channel.topic || "Team real-time collaboration channel"}
            </p>
          </div>
        </div>

        {/* Action Buttons: Video Meeting, Audio Call, Members */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartCall}
            className="flex items-center gap-1.5 rounded-xl bg-[#6F8863] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#5E7653] dark:bg-[#A3B899] dark:text-slate-900 dark:hover:bg-[#8FA884]"
            title="Start Audio/Video Meeting"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Meet</span>
          </button>

          <button
            onClick={handleStartCall}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
            title="Start Audio Conference Call"
          >
            <PhoneCall className="h-3.5 w-3.5 text-slate-500" />
            <span>Call</span>
          </button>

          <button
            onClick={onOpenMembers}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
          >
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span>Members & RBAC</span>
          </button>
        </div>
      </div>

      {/* Live Meeting Banner */}
      {hasActiveMeeting && (
        <div className="flex items-center justify-between border-b border-red-200/80 bg-red-50/90 px-6 py-2 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <Radio className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            <span>
              <strong>Live Team Call in progress</strong> (Started by {meetingInitiator || "Team"})
            </span>
          </div>
          <button
            onClick={() => setIsMeetingOpen(true)}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 shadow-sm"
          >
            Join Meeting
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-xs text-slate-400">
            Loading real-time conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A3B899]/30 text-[#425739] dark:bg-[#A3B899]/20 dark:text-[#A3B899]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Welcome to #{channel.name}!
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              This is the start of the #{channel.name} channel. Send a message, start an audio/video meeting, or share a document with your team.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUser?.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#778A9B]/30 text-xs font-bold text-[#2C3B49] dark:bg-[#778A9B]/40 dark:text-[#E2E8F0]">
                    {msg.user?.name ? msg.user.name.slice(0, 2).toUpperCase() : "U"}
                  </div>
                )}

                <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end text-right" : ""}`}>
                  {!isMe && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {msg.user?.name || "Team Member"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm shadow-2xs ${
                      isMe
                        ? "bg-[#6F8863] text-white dark:bg-[#7D9B71]"
                        : "border border-slate-200/80 bg-white/90 text-slate-800 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {/* Attachments List */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2.5 space-y-1.5 pt-2 border-t border-white/20 dark:border-slate-700/60">
                        {msg.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 rounded-lg bg-black/10 px-3 py-1.5 text-xs backdrop-blur-xs dark:bg-white/10"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate font-medium">{att.name}</span>
                              {att.size && (
                                <span className="shrink-0 text-[10px] opacity-75">
                                  ({att.size})
                                </span>
                              )}
                            </div>
                            <Download className="h-3.5 w-3.5 shrink-0 opacity-75 hover:opacity-100 cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isMe && (
                    <div className="text-[10px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1 text-xs text-slate-500 italic dark:text-slate-400 shrink-0">
          {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
        </div>
      )}

      {/* Pending Attachments Strip */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-6 py-2 bg-slate-50/80 border-t border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-800/60 shrink-0">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-slate-200"
            >
              <FileText className="h-3.5 w-3.5 text-[#6F8863]" />
              <span className="max-w-[150px] truncate">{att.name}</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                className="ml-1 text-slate-400 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="border-t border-slate-200/60 bg-white/70 p-4 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/70 shrink-0">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
          {/* Attachment Button & Popup */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {showAttachMenu && (
              <div className="absolute bottom-12 left-0 z-20 w-52 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-800">
                <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Share in channel
                </div>
                <button
                  type="button"
                  onClick={() => addSampleAttachment("doc")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  PDF / Document
                </button>
                <button
                  type="button"
                  onClick={() => addSampleAttachment("image")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Smile className="h-3.5 w-3.5 text-emerald-500" />
                  Design Mockup / Image
                </button>
                <button
                  type="button"
                  onClick={() => addSampleAttachment("code")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Hash className="h-3.5 w-3.5 text-amber-500" />
                  Code / Script Patch
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder={`Message #${channel.name}...`}
            value={inputText}
            onChange={handleInputChange}
            className="flex-1 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#A3B899] focus:outline-none focus:ring-2 focus:ring-[#A3B899]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && attachments.length === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6F8863] text-white shadow-sm transition-all hover:bg-[#5E7653] disabled:opacity-40 dark:bg-[#A3B899] dark:text-slate-900 dark:hover:bg-[#8FA884]"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Team Video Conference & Call Room Modal */}
      <TeamMeetingRoom
        isOpen={isMeetingOpen}
        channel={channel}
        currentUser={currentUser}
        onClose={() => setIsMeetingOpen(false)}
      />
    </div>
  );
};
