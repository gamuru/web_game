// 레벨 정의: 각 튜브의 초기 색상 배치(배열 인덱스 0 = 맨 아래)
export interface LevelDef {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tubeCapacity: number;
  tubes: string[][];
}

export const LEVELS: LevelDef[] = [
  {
    id: 'level-1',
    name: '튜토리얼',
    difficulty: 1,
    tubeCapacity: 4,
    tubes: [
      ['red', 'blue', 'red', 'blue'],
      ['red', 'blue', 'blue', 'red'],
      [],
      [],
    ],
  },
  {
    id: 'level-2',
    name: '레벨 2',
    difficulty: 1,
    tubeCapacity: 4,
    tubes: [
      ['blue', 'red', 'green', 'blue'],
      ['red', 'green', 'green', 'green'],
      ['red', 'red', 'blue', 'blue'],
      [],
      [],
    ],
  },
  {
    id: 'level-3',
    name: '레벨 3',
    difficulty: 2,
    tubeCapacity: 4,
    tubes: [
      ['blue', 'blue', 'green', 'blue'],
      ['green', 'green', 'red', 'green'],
      ['red', 'red', 'blue', 'red'],
      [],
    ],
  },
  {
    id: 'level-4',
    name: '레벨 4',
    difficulty: 2,
    tubeCapacity: 4,
    tubes: [
      ['green', 'green', 'green', 'yellow'],
      ['yellow', 'blue', 'red', 'yellow'],
      ['red', 'green', 'yellow', 'blue'],
      ['red', 'blue', 'blue', 'red'],
      [],
      [],
    ],
  },
  {
    id: 'level-5',
    name: '레벨 5',
    difficulty: 3,
    tubeCapacity: 4,
    tubes: [
      ['yellow', 'yellow', 'blue', 'blue'],
      ['blue', 'green', 'red', 'yellow'],
      ['green', 'blue', 'red', 'green'],
      ['red', 'yellow', 'green', 'red'],
      [],
    ],
  },
  {
    id: 'level-6',
    name: '레벨 6',
    difficulty: 3,
    tubeCapacity: 4,
    tubes: [
      ['green', 'yellow', 'yellow', 'yellow'],
      ['purple', 'blue', 'red', 'red'],
      ['red', 'red', 'green', 'purple'],
      ['purple', 'blue', 'blue', 'yellow'],
      ['blue', 'green', 'green', 'purple'],
      [],
      [],
    ],
  },
  {
    id: 'level-7',
    name: '레벨 7',
    difficulty: 4,
    tubeCapacity: 4,
    tubes: [
      ['purple', 'blue', 'red', 'green'],
      ['yellow', 'blue', 'yellow', 'blue'],
      ['purple', 'red', 'red', 'yellow'],
      ['blue', 'yellow', 'purple', 'green'],
      ['purple', 'green', 'red', 'green'],
      [],
    ],
  },
  {
    id: 'level-8',
    name: '레벨 8',
    difficulty: 4,
    tubeCapacity: 5,
    tubes: [
      ['green', 'purple', 'purple', 'yellow', 'yellow'],
      ['red', 'blue', 'red', 'red', 'red'],
      ['blue', 'purple', 'purple', 'blue', 'yellow'],
      ['blue', 'green', 'blue', 'red', 'green'],
      ['yellow', 'green', 'yellow', 'purple', 'green'],
      [],
      [],
    ],
  },
  {
    id: 'level-9',
    name: '레벨 9',
    difficulty: 4,
    tubeCapacity: 4,
    tubes: [
      ['purple', 'orange', 'green', 'green'],
      ['purple', 'blue', 'orange', 'purple'],
      ['orange', 'green', 'yellow', 'yellow'],
      ['purple', 'red', 'green', 'red'],
      ['red', 'blue', 'red', 'yellow'],
      ['yellow', 'blue', 'orange', 'blue'],
      [],
      [],
    ],
  },
  {
    id: 'level-10',
    name: '레벨 10',
    difficulty: 5,
    tubeCapacity: 5,
    tubes: [
      ['green', 'blue', 'green', 'orange', 'yellow'],
      ['orange', 'green', 'orange', 'red', 'orange'],
      ['purple', 'purple', 'red', 'yellow', 'red'],
      ['blue', 'yellow', 'purple', 'red', 'yellow'],
      ['green', 'orange', 'blue', 'purple', 'red'],
      ['yellow', 'blue', 'green', 'blue', 'purple'],
      [],
    ],
  },
];
