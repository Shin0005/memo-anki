import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { DeckService } from './deck.service';
import { CreateDeckRequest } from './dto/create-deck.request';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUserId } from '../common/decorators/get-userid.decorator';
import { UpdateDeckRequest } from './dto/update-deck.request';
import { DeckResponse } from './dto/deck.response';
import { RequiredDeckIdRequest } from './dto/required-deckid.request';

@Controller('deck')
export class DeckController {
  constructor(private deckService: DeckService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createDeck(
    @GetUserId() userId: string,
    @Body() request: CreateDeckRequest,
  ) {
    const response = await this.deckService.createDeck(userId, request);
    return new DeckResponse(response);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getDecks(@GetUserId() userId: string) {
    const response = await this.deckService.getDecks(userId);
    return response.map((deck) => new DeckResponse(deck));
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async updateDeck(
    @GetUserId() userId: string,
    @Body() request: UpdateDeckRequest,
  ) {
    const response = await this.deckService.updateDeck(userId, request);
    return new DeckResponse(response);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDeck(
    @GetUserId() userId: string,
    @Body() request: RequiredDeckIdRequest,
  ) {
    await this.deckService.deleteDeck(userId, request);
  }
}
