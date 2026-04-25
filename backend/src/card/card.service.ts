import { Card, Prisma } from '@prisma/client';
import { ICardRepository } from './card.repository.interface';
import {
  CardnameAlreadyExistException,
  CardNotFoundException,
  DeckNotFoundException,
} from '../common/exceptions/domain.exceptions';

import { Inject, Injectable } from '@nestjs/common';
import { DeckService } from '../deck/deck.service';

export enum CardType {
  NOTE = 0,
  QUIZ = 1,
}

export type CreateCardDto = {
  deckId: string;
  userId: string;
  name: string;
  type: CardType;
  content: string | null;
  question: string | null;
  answer: string | null;
};

export type UpdateCardDto = {
  userId: string;
  name: string;
  content: string | null;
  question: string | null;
  answer: string | null;
};

@Injectable()
export class CardService {
  constructor(
    @Inject('ICardRepository') // DI用のtoken
    private readonly iCardRepository: ICardRepository,
    private readonly deckService: DeckService,
  ) {}

  /**
   * 現在のユーザで既存のcardのnameがないか検索する
   * 該当するnameがある場合にCardを返却する
   * @param name
   * @returns Card
   */
  private async getCardByName(
    userId: string,
    cardname: string,
  ): Promise<Card | null> {
    return await this.iCardRepository.findByCardname(userId, cardname);
  }

  /**
   * 既存のcardのidがないか検索する
   * 該当するidがある場合にCardを返却する。
   * @param cardId
   * @returns Card
   */
  private async getCardById(
    userId: string,
    cardId: bigint,
  ): Promise<Card | null> {
    return await this.iCardRepository.findByCardId(userId, cardId);
  }

  async createCard(dto: CreateCardDto) {
    // 与えられたdeckidが存在するかまたはユーザのものかを検証
    const deck = await this.deckService.getDeckById(dto.userId, dto.deckId);
    if (!deck) throw new DeckNotFoundException(dto.deckId);

    // useridが同じかつcardの名前がすでにあるなら例外スロー
    if (await this.getCardByName(dto.userId, dto.name))
      throw new CardnameAlreadyExistException(dto.name);

    const isNote = dto.type === CardType.NOTE;
    // prismaの型に入れ替えることによって安全にDB操作
    const cardInput: Prisma.CardUncheckedCreateInput = {
      deckId: deck.id,
      name: dto.name,
      type: dto.type,
      content: isNote ? dto.content : null,
      question: isNote ? null : dto.question,
      answer: isNote ? null : dto.answer,
    };
    // repositoryへはdeckidのチェックをさせるためにdtoの直利用を禁止
    return await this.iCardRepository.createCard(dto.userId, cardInput);
  }

  async getCards(userId: string) {
    return await this.iCardRepository.findCards(userId);
  }

  async updateCard(cardId: string, dto: UpdateCardDto) {
    // id存在チェックとname重複チェックを一つにまとめる
    // ここで対象のcardを特定。以降他人のcardを触る心配はない。
    const card = await this.getCardById(dto.userId, BigInt(cardId));

    // idが存在しないとき
    if (!card) {
      throw new CardNotFoundException(cardId);
      // nameが編集されていないなら通す。違う名前なら検索する
    } else if (card.name !== dto.name) {
      if (await this.getCardByName(dto.userId, dto.name))
        throw new CardnameAlreadyExistException(dto.name);
    }
    const isNote = card.type === Number(CardType.NOTE);

    const cardInput: Prisma.CardUncheckedUpdateInput = {
      id: card.id, // 確実に間違いのないcardIdにより多重防御
      name: dto.name,
      content: isNote ? dto.content : null,
      question: isNote ? null : dto.question,
      answer: isNote ? null : dto.answer,
    };

    // cardIdが確定しているのでuserIdを気にする必要はない
    return await this.iCardRepository.updateCard(
      dto.userId,
      card.id,
      cardInput,
    );
  }

  async deleteCard(userId: string, cardId: string) {
    if (!(await this.getCardById(userId, BigInt(cardId))))
      throw new CardNotFoundException(cardId);

    await this.iCardRepository.deleteCard(userId, BigInt(cardId));
  }
}
