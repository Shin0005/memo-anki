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
import { ParseBigIntIdPipe } from '../common/pipes/parse-bigint-id.pipe';
import { CardService, CreateCardDto, UpdateCardDto } from './card.service';
import { CreateCardRequest } from './dto/create-card.request';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUserId } from '../common/decorators/get-userid.decorator';
import { CardResponse } from './dto/card.response';
import { UpdateCardRequest } from './dto/update-card.request';
import { Card } from '@prisma/client';

@Controller('card')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createCard(
    @GetUserId() userId: string,
    @Body() request: CreateCardRequest,
  ) {
    const createCardDto: CreateCardDto = {
      deckId: request.deckId, // requestでエラーはじく
      userId,
      name: request.name,
      type: request.type,
      content: request.content ?? null,
      question: request.question ?? null,
      answer: request.answer ?? null,
    };

    const response = await this.cardService.createCard(createCardDto);
    return new CardResponse(response);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getCards(@GetUserId() userId: string) {
    const responses: Card[] = await this.cardService.getCards(userId);
    return responses.map((card) => new CardResponse(card));
  }

  @UseGuards(JwtAuthGuard)
  @Put(':cardId')
  @ApiParam({
    name: 'cardId',
    example: '1',
    description: 'bigint ID of the card',
  })
  @ApiResponse({ status: 200, type: CardResponse })
  async updateCard(
    @GetUserId() userId: string,
    @Param('cardId', ParseBigIntIdPipe) cardId: string,
    @Body() request: UpdateCardRequest,
  ) {
    const updateCardDto: UpdateCardDto = {
      userId,
      name: request.name,
      content: request.content ?? null,
      question: request.question ?? null,
      answer: request.answer ?? null,
    };

    const response = await this.cardService.updateCard(cardId, updateCardDto);
    return new CardResponse(response);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':cardId')
  @ApiParam({
    name: 'cardId',
    example: '1',
    description: 'bigint ID of the card',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCard(
    @GetUserId() userId: string,
    @Param('cardId', ParseBigIntIdPipe) cardId: string,
  ) {
    await this.cardService.deleteCard(userId, cardId);
  }
}
