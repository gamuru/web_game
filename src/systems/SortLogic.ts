// Phaser에 의존하지 않는 순수 정렬 규칙. GameScene은 이 로직을 호출해 시각 표현만 담당한다.

export interface PourResult {
  from: string[];
  to: string[];
  movedCount: number;
}

/** from 튜브 맨 위의 연속된 같은 색 덩어리 크기를 반환한다. */
function topBlockSize(tube: string[]): number {
  if (tube.length === 0) return 0;
  const topColor = tube[tube.length - 1];
  let count = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === topColor; i--) {
    count++;
  }
  return count;
}

/** to 튜브로 from 튜브의 맨 위 색을 부을 수 있는지 판정한다. */
export function canPour(from: string[], to: string[], capacity: number): boolean {
  if (from.length === 0) return false;
  if (to.length >= capacity) return false;
  if (to.length === 0) return true;
  return to[to.length - 1] === from[from.length - 1];
}

/**
 * from의 맨 위 색 덩어리를 to로 옮긴다. 실제로 옮기는 수량은
 * (덩어리 크기, to의 남은 공간) 중 더 작은 값으로 제한된다.
 * canPour가 false인 상태로 호출하면 안 된다 — 호출 전 반드시 canPour로 확인한다.
 */
export function pour(from: string[], to: string[], capacity: number): PourResult {
  const blockSize = topBlockSize(from);
  const space = capacity - to.length;
  const movedCount = Math.min(blockSize, space);
  const color = from[from.length - 1];

  const nextFrom = from.slice(0, from.length - movedCount);
  const nextTo = [...to, ...Array(movedCount).fill(color)];

  return { from: nextFrom, to: nextTo, movedCount };
}

/**
 * 모든 튜브가 비어있거나, 단일 색으로 가득 차 있으면(용량만큼) 클리어.
 * 길이가 용량보다 작은 단색 튜브(예: [red])는 아직 해당 색이 다른 튜브에도
 * 남아있다는 뜻이므로 클리어로 치면 안 된다 — capacity까지 채워졌는지 반드시 함께 확인한다.
 */
export function isSolved(tubes: string[][], capacity: number): boolean {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === capacity && tube.every((c) => c === tube[0])),
  );
}

/**
 * 막힌 상황 탈출용 재배치. 전체 색상 유닛을 모아 같은 튜브 개수/용량 안에서
 * 무작위로 다시 분배한다. 재배치 후 반드시 풀 수 있다는 보장은 하지 않는다
 * (막다른 상황을 벗어나기 위한 것이지, 항상 해가 있는 재배치를 만드는 것이 목적이 아니다).
 */
export function shuffle(tubes: string[][], capacity: number): string[][] {
  const allUnits = tubes.flat();
  for (let i = allUnits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allUnits[i], allUnits[j]] = [allUnits[j], allUnits[i]];
  }

  const result: string[][] = tubes.map(() => []);
  let cursor = 0;
  for (let t = 0; t < result.length && cursor < allUnits.length; t++) {
    while (result[t].length < capacity && cursor < allUnits.length) {
      result[t].push(allUnits[cursor]);
      cursor++;
    }
  }
  return result;
}
