import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { DeckService } from './deck.service';
import { CreateDeckRequest } from './dto/create-deck.request';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUserId } from '../common/decorators/get-userid.decorator';
import { UpdateDeckRequest } from './dto/update-deck.request';
import { DeckResponse } from './dto/deck.response';

@Controller('deck')
export class DeckController {
  constructor(private deckService: DeckService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiResponse({ status: 201, type: DeckResponse })
  async createDeck(
    @GetUserId() userId: string,
    @Body() request: CreateDeckRequest,
  ) {
    const response = await this.deckService.createDeck(userId, request);
    return new DeckResponse(response);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiResponse({ status: 200, type: [DeckResponse] })
  async getDecks(@GetUserId() userId: string) {
    const response = await this.deckService.getDecks(userId);
    return response.map((deck) => new DeckResponse(deck));
  }

  @UseGuards(JwtAuthGuard)
  @Put(':deckId')
  @ApiParam({
    name: 'deckId',
    example: '1',
    description: 'bigint ID of the deck',
  })
  @ApiResponse({ status: 200, type: DeckResponse })
  async updateDeck(
    @GetUserId() userId: string,
    @Param('deckId') deckId: string,
    @Body() request: UpdateDeckRequest,
  ) {
    const response = await this.deckService.updateDeck(userId, deckId, request);
    return new DeckResponse(response);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':deckId')
  @ApiParam({
    name: 'deckId',
    example: '1',
    description: 'bigint ID of the deck',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDeck(
    @GetUserId() userId: string,
    @Param('deckId') deckId: string,
  ) {
    await this.deckService.deleteDeck(userId, deckId);
  }
}
