export class Time {
  public deltaTime = 0;
  public elapsedTime = 0;
  public frame = 0;
  public timeScale = 1;

  update(deltaTime: number, elapsedTime: number): void {
    this.deltaTime = deltaTime * this.timeScale;
    this.elapsedTime = elapsedTime;
    this.frame++;
  }
}