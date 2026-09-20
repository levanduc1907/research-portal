import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ChatService, CreateChannelDto, PostMessageDto } from "./chat.service";

@ApiTags("Chat & Channels")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("teams/:teamId/channels")
  @ApiOperation({ summary: "List all channels for a team" })
  getTeamChannels(@Param("teamId") teamId: string, @CurrentUser() user: any) {
    return this.chatService.getTeamChannels(teamId, user.id);
  }

  @Post("teams/:teamId/channels")
  @ApiOperation({ summary: "Create a new channel in a team" })
  createChannel(
    @Param("teamId") teamId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateChannelDto
  ) {
    return this.chatService.createChannel(teamId, user.id, dto);
  }

  @Get("channels/:channelId/messages")
  @ApiOperation({ summary: "Get message history for a channel" })
  getChannelMessages(
    @Param("channelId") channelId: string,
    @CurrentUser() user: any,
    @Query("limit") limit?: string
  ) {
    return this.chatService.getChannelMessages(channelId, user.id, limit ? parseInt(limit, 10) : 50);
  }

  @Post("channels/:channelId/messages")
  @ApiOperation({ summary: "Post a message to a channel" })
  postMessage(
    @Param("channelId") channelId: string,
    @CurrentUser() user: any,
    @Body() dto: PostMessageDto
  ) {
    return this.chatService.postMessage(channelId, user.id, dto);
  }
}
