/** 每个同学是一个小动物，按 id 轮流取 */
export const ANIMALS = ['🐻', '🐰', '🐱', '🐶', '🐼', '🦊', '🐸', '🐵', '🐯', '🐷'];
export const animalOf = (id: number) => ANIMALS[id % ANIMALS.length];
