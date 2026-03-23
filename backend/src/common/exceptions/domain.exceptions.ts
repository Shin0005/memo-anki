import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 抽象ドメイン例外 継承させて使用する
 */
export abstract class DomainException extends HttpException {
  constructor(message: string, status: HttpStatus) {
    super(message, status);
  }
}
/*
  User系
*/
export class UserNotFoundException extends DomainException {
  constructor(userId: string) {
    super(`UserId: ${userId} is not found.`, HttpStatus.NOT_FOUND);
  }
}

export class UserIdAlreadyExistException extends DomainException {
  constructor(userId: string) {
    super(`This UserId: ${userId} is already exist.`, HttpStatus.CONFLICT);
  }
}

export class UserEmailAlreadyExistException extends DomainException {
  constructor(email: string) {
    super(`This email: ${email} is already exist.`, HttpStatus.CONFLICT);
  }
}
/*
  Auth系
*/
export class LoginFailedException extends DomainException {
  constructor(onError: string) {
    super(`Login Failed due to ${onError} error.`, HttpStatus.UNAUTHORIZED);
  }
}

/*
  Deck系
*/
export class DeckNotFoundException extends DomainException {
  constructor(deckId: string) {
    super(`DeckId: ${deckId} is not found.`, HttpStatus.NOT_FOUND);
  }
}

export class DecknameAlreadyExistException extends DomainException {
  constructor(deckname: string) {
    super(`This Deckname: ${deckname} is already exist.`, HttpStatus.CONFLICT);
  }
}
