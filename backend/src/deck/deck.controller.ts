import {
  Body,
  Controller,
  Delete,
  Get,
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
    const response: DeckResponse = await this.deckService.createDeck(
      userId,
      request,
    );
    return response;
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getDecks(@GetUserId() userId: string) {
    const response: DeckResponse[] = await this.deckService.getDecks(userId);
    return response;
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async updateDeck(
    @GetUserId() userId: string,
    @Body() request: UpdateDeckRequest,
  ) {
    const response: DeckResponse = await this.deckService.updateDeck(
      userId,
      request,
    );
    return response;
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteDeck(
    @GetUserId() userId: string,
    @Body() request: RequiredDeckIdRequest,
  ) {
    const response: DeckResponse = await this.deckService.deleteDeck(
      userId,
      request,
    );
    return response;
  }
}
