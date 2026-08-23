export type CrossedWiresQuestionPair = {
  id: string;
  mainQuestion: string;
  imposterQuestion: string;
};

// Test content only. Replace or expand this bank when the personalized pairs are ready.
export const crossedWiresQuestionPairs: CrossedWiresQuestionPair[] = [
  {
    id: "vacation-style",
    mainQuestion: "What is the best type of vacation?",
    imposterQuestion: "What is the most overrated type of vacation?",
  },
  {
    id: "pizza-topping",
    mainQuestion: "What is the best pizza topping?",
    imposterQuestion: "What is the worst pizza topping?",
  },
  {
    id: "fast-food",
    mainQuestion: "What is the best fast food restaurant?",
    imposterQuestion: "What is the most overrated fast food restaurant?",
  },
];
