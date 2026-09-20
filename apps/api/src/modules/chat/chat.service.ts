import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { ChatGateway } from "./chat.gateway";
import { TeamRole } from "@repo/database";

export interface CreateChannelDto {
  name: string;
  topic?: string;
}

export interface PostMessageDto {
  content: string;
  attachments?: any[];
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway
  ) {}

  async getTeamChannels(teamId: string, userId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException("You are not part of this team");
    }

    return this.prisma.channel.findMany({
      where: { teamId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async createChannel(teamId: string, userId: string, dto: CreateChannelDto) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership || (membership.role !== TeamRole.OWNER && membership.role !== TeamRole.ADMIN && membership.role !== TeamRole.EDITOR)) {
      throw new ForbiddenException("Only Editors, Admins or Owners can create channels");
    }

    const cleanName = dto.name.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "-");
    const channel = await this.prisma.channel.create({
      data: {
        teamId,
        name: cleanName,
        topic: dto.topic || "",
      },
    });

    return channel;
  }

  async getChannelMessages(channelId: string, userId: string, limit = 50) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException("Channel not found");
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: channel.teamId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException("You are not part of this team");
    }

    return this.prisma.message.findMany({
      where: { channelId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async postMessage(channelId: string, userId: string, dto: PostMessageDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException("Channel not found");
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: channel.teamId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException("You are not part of this team");
    }

    const message = await this.prisma.message.create({
      data: {
        channelId,
        userId,
        content: dto.content,
        attachments: dto.attachments || [],
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
    });

    // Broadcast via WebSocket
    this.chatGateway.server.to(`channel:${channelId}`).emit("new_message", message);

    return message;
  }
}
