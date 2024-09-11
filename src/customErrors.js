export class IncorrectParamError extends Error {
  constructor(message) {
    super(message);
    this.name = "IncorrectParamError";
  }
}
