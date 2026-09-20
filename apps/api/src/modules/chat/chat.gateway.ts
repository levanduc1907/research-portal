import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join_channel")
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; user?: { id: string; name: string } }
  ) {
    client.join(`channel:${data.channelId}`);
    this.logger.log(`User ${data.user?.name || client.id} joined channel ${data.channelId}`);
    client.to(`channel:${data.channelId}`).emit("user_joined", {
      user: data.user,
      channelId: data.channelId,
    });
    return { status: "ok", channelId: data.channelId };
  }

  @SubscribeMessage("leave_channel")
  handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; user?: { id: string; name: string } }
  ) {
    client.leave(`channel:${data.channelId}`);
    client.to(`channel:${data.channelId}`).emit("user_left", {
      user: data.user,
      channelId: data.channelId,
    });
    return { status: "ok" };
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; user: { id: string; name: string }; isTyping: boolean }
  ) {
    client.to(`channel:${data.channelId}`).emit("user_typing", data);
  }

  @SubscribeMessage("send_message")
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: any
  ) {
    // Broadcast message to everyone in the channel room including the sender
    this.server.to(`channel:${message.channelId}`).emit("new_message", message);
  }

  @SubscribeMessage("note_lock_update")
  handleNoteLockUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { noteId: string; teamId: string; lockedBy: { id: string; name: string } | null }
  ) {
    this.server.emit(`team:${data.teamId}:note_lock`, data);
  }

  @SubscribeMessage("note_content_update")
  handleNoteContentUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { noteId: string; teamId: string; title: string; content: string; author: any }
  ) {
    client.broadcast.emit(`note:${data.noteId}:updated`, data);
  }

  // --- Team Video Call & Audio Meeting Events ---
  @SubscribeMessage("start_meeting")
  handleStartMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; teamId: string; initiator: { id: string; name: string; avatar?: string } }
  ) {
    this.logger.log(`Meeting started in channel ${data.channelId} by ${data.initiator.name}`);
    this.server.to(`channel:${data.channelId}`).emit("meeting_started", {
      channelId: data.channelId,
      teamId: data.teamId,
      initiator: data.initiator,
      startedAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage("join_meeting")
  handleJoinMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; user: { id: string; name: string; avatar?: string } }
  ) {
    client.to(`channel:${data.channelId}`).emit("meeting_user_joined", {
      channelId: data.channelId,
      user: data.user,
    });
  }

  @SubscribeMessage("leave_meeting")
  handleLeaveMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; user: { id: string; name: string } }
  ) {
    client.to(`channel:${data.channelId}`).emit("meeting_user_left", {
      channelId: data.channelId,
      user: data.user,
    });
  }

  @SubscribeMessage("end_meeting")
  handleEndMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; endedBy: { id: string; name: string } }
  ) {
    this.server.to(`channel:${data.channelId}`).emit("meeting_ended", {
      channelId: data.channelId,
      endedBy: data.endedBy,
    });
  }

  @SubscribeMessage("meeting_action")
  handleMeetingAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; userId: string; action: "mic" | "cam" | "screen" | "hand"; state: boolean }
  ) {
    client.to(`channel:${data.channelId}`).emit("meeting_user_action", data);
  }
}
