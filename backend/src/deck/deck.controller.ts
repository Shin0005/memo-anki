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
  UsePipes,
} from '@nestjs/common';
import {
  CreateDeckRequest,
  CreateDeckRequestSchema,
  UpdateDeckRequest,
  UpdateDeckRequestSchema,
  RequiredDeckIdRequest,
  RequiredDeckIdRequestSchema,
} from '@memo-anki/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DeckService } from './deck.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUserId } from '../common/decorators/get-userid.decorator';
import { DeckResponse } from './dto/deck.response';

@Controller('deck')
export class DeckController {
  constructor(private deckService: DeckService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UsePipes(new ZodValidationPipe(CreateDeckRequestSchema))
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
  @UsePipes(new ZodValidationPipe(UpdateDeckRequestSchema))
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
  @UsePipes(new ZodValidationPipe(RequiredDeckIdRequestSchema))
  async deleteDeck(
    @GetUserId() userId: string,
    @Body() request: RequiredDeckIdRequest,
  ) {
    await this.deckService.deleteDeck(userId, request);
  }
}
