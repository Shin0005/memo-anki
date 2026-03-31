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
import { CardService, CreateCardDto, UpdateCardDto } from './card.service';
import { CreateCardRequest } from './dto/create-card.request';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUserId } from '../common/decorators/get-userid.decorator';
import { CardResponse } from './dto/card.response';
import { UpdateCardRequest } from './dto/update-card.request';
import { Card } from '@prisma/client';
import { RequiredCardIdRequest } from './dto/required-cardid.request';

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
      deckId: BigInt(request.deckId), // requestでエラーはじく
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
  @Put()
  async updateCard(
    @GetUserId() userId: string,
    @Body() request: UpdateCardRequest,
  ) {
    const updateCardDto: UpdateCardDto = {
      cardId: BigInt(request.cardId), // requestでエラーはじく
      userId,
      name: request.name,
      content: request.content ?? null,
      question: request.question ?? null,
      answer: request.answer ?? null,
    };

    const response = await this.cardService.updateCard(updateCardDto);
    return new CardResponse(response);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCard(
    @GetUserId() userId: string,
    @Body() request: RequiredCardIdRequest,
  ) {
    await this.cardService.deleteCard(userId, BigInt(request.cardId));
  }
}
