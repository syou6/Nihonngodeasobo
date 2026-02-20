/**
 * Versant Practice Questions
 * Part E: Summary - Level-adjusted
 * Part F: Opinion - No level adjustment needed
 */

import { VERSANT } from './constants';
import type { CEFRLevel } from './constants';

const PART_E_TIME = VERSANT.PART_E.TIME_LIMIT;
const PART_F_TIME = VERSANT.PART_F.TIME_LIMIT;

// Re-export for backward compatibility
export type { CEFRLevel } from './constants';

export interface VersantQuestion {
  id: string;
  part: 'E' | 'F';
  text: string;
  timeLimit: number; // seconds
  category?: string;
  cefrLevel?: CEFRLevel;
}

// Part E: Summary Questions - grouped by CEFR level
export const partEQuestions: VersantQuestion[] = [
  // A1 level
  {
    id: 'e-a1-1',
    part: 'E',
    text: `Tom goes to school every day. He likes math and science. After school, he plays soccer with his friends. He goes home at five o'clock and eats dinner with his family.`,
    timeLimit: PART_E_TIME,
    category: 'Daily Life',
    cefrLevel: 'A1'
  },
  {
    id: 'e-a1-2',
    part: 'E',
    text: `Maria works at a shop. She sells fruit and vegetables. The shop opens at eight in the morning. Many people come to buy food. Maria likes her job because she meets nice people.`,
    timeLimit: PART_E_TIME,
    category: 'Work',
    cefrLevel: 'A1'
  },
  {
    id: 'e-a1-3',
    part: 'E',
    text: `It is sunny today. The children are playing in the park. Some children are running. Some children are eating ice cream. Everyone is happy because the weather is nice.`,
    timeLimit: PART_E_TIME,
    category: 'Weather',
    cefrLevel: 'A1'
  },
  // A1+ level
  {
    id: 'e-a1p-1',
    part: 'E',
    text: `Lisa wants to buy a new phone. She goes to the electronics store near her house. The store has many phones. She chooses a blue one because it is not too expensive. She is happy with her new phone.`,
    timeLimit: PART_E_TIME,
    category: 'Shopping',
    cefrLevel: 'A1+'
  },
  {
    id: 'e-a1p-2',
    part: 'E',
    text: `John and his family went to the beach last weekend. They swam in the sea and made a sandcastle. John's mother brought sandwiches and juice. They stayed until the evening and watched the sunset.`,
    timeLimit: PART_E_TIME,
    category: 'Leisure',
    cefrLevel: 'A1+'
  },
  {
    id: 'e-a1p-3',
    part: 'E',
    text: `My neighbor has a small garden. She grows tomatoes, carrots, and flowers. Every morning, she waters the plants. Sometimes she gives vegetables to her friends. She says gardening makes her feel relaxed.`,
    timeLimit: PART_E_TIME,
    category: 'Hobbies',
    cefrLevel: 'A1+'
  },
  // A2 level
  {
    id: 'e-a2-1',
    part: 'E',
    text: `A new café opened near the train station last week. It serves coffee, tea, and homemade cakes. The prices are reasonable and the staff is friendly. Many people go there after work because it has free Wi-Fi and comfortable chairs.`,
    timeLimit: PART_E_TIME,
    category: 'Food',
    cefrLevel: 'A2'
  },
  {
    id: 'e-a2-2',
    part: 'E',
    text: `The local library started a reading program for children. Every Saturday, volunteers read stories to kids aged 5 to 10. Parents say their children enjoy the program and want to read more books at home. The library plans to continue the program next year.`,
    timeLimit: PART_E_TIME,
    category: 'Education',
    cefrLevel: 'A2'
  },
  {
    id: 'e-a2-3',
    part: 'E',
    text: `Sarah decided to start exercising this year. She walks for 30 minutes every morning before work. On weekends, she goes swimming at the local pool. After two months, she feels healthier and sleeps better at night.`,
    timeLimit: PART_E_TIME,
    category: 'Health',
    cefrLevel: 'A2'
  },
  // A2+ level
  {
    id: 'e-a2p-1',
    part: 'E',
    text: `A supermarket in town is trying to reduce plastic waste. They stopped giving free plastic bags to customers last month. Now, shoppers need to bring their own bags or buy paper ones. Most customers support this change, although some find it inconvenient at first.`,
    timeLimit: PART_E_TIME,
    category: 'Environment',
    cefrLevel: 'A2+'
  },
  {
    id: 'e-a2p-2',
    part: 'E',
    text: `The city has introduced a bike-sharing service. People can rent a bicycle using a phone app. There are 100 bikes available at 20 stations around the city center. The first 30 minutes are free. The mayor hopes more people will use bikes instead of cars.`,
    timeLimit: PART_E_TIME,
    category: 'Transportation',
    cefrLevel: 'A2+'
  },
  {
    id: 'e-a2p-3',
    part: 'E',
    text: `A school in the city started offering cooking classes to students. Every Friday afternoon, a professional chef teaches them how to make simple, healthy meals. Students learn about nutrition and how to follow recipes. Many parents are happy because their children now help with cooking at home.`,
    timeLimit: PART_E_TIME,
    category: 'Education',
    cefrLevel: 'A2+'
  },
  // B1 level
  {
    id: 'e-b1-1',
    part: 'E',
    text: `The company decided to implement a new remote work policy. Starting next month, employees can work from home up to three days per week. This change was made after a survey showed that 80% of employees preferred flexible work arrangements. The management believes this will improve work-life balance and reduce commuting stress.`,
    timeLimit: PART_E_TIME,
    category: 'Business',
    cefrLevel: 'B1'
  },
  {
    id: 'e-b1-2',
    part: 'E',
    text: `A new study found that people who exercise regularly have better memory and concentration. Researchers tested 500 participants over two years. Those who exercised at least 30 minutes a day performed 20% better on cognitive tests. The scientists recommend combining physical activity with mental exercises for best results.`,
    timeLimit: PART_E_TIME,
    category: 'Health',
    cefrLevel: 'B1'
  },
  {
    id: 'e-b1-3',
    part: 'E',
    text: `A famous restaurant chain is changing its menu to include more plant-based options. The CEO said customer demand for vegetarian and vegan dishes has doubled in the past year. They will introduce ten new items next month. The company also plans to use only sustainable packaging by the end of the year.`,
    timeLimit: PART_E_TIME,
    category: 'Food',
    cefrLevel: 'B1'
  },
  // B1+ level
  {
    id: 'e-b1p-1',
    part: 'E',
    text: `The city announced a new public transportation plan. They will add 50 electric buses and extend the subway line to the airport. The project will cost 2 billion dollars and take three years to complete. Officials expect this will reduce traffic congestion by 30% and help the environment by cutting carbon emissions significantly.`,
    timeLimit: PART_E_TIME,
    category: 'Transportation',
    cefrLevel: 'B1+'
  },
  {
    id: 'e-b1p-2',
    part: 'E',
    text: `Universities are seeing a rise in online learning. Last year, enrollment in online courses increased by 40%. Students say they like the flexibility of studying from anywhere. However, some professors worry that students miss important social interactions. Many schools are now offering hybrid programs that combine online and in-person classes.`,
    timeLimit: PART_E_TIME,
    category: 'Education',
    cefrLevel: 'B1+'
  },
  // B2 level
  {
    id: 'e-b2-1',
    part: 'E',
    text: `A technology company launched a new smartphone with advanced AI features. The phone can translate conversations in real-time and take professional-quality photos automatically. It costs $999 and will be available in stores next week. Early reviews say the battery life could be better, but overall the phone has received positive feedback from industry analysts.`,
    timeLimit: PART_E_TIME,
    category: 'Technology',
    cefrLevel: 'B2'
  },
  {
    id: 'e-b2-2',
    part: 'E',
    text: `Recent research suggests that the traditional eight-hour workday may not be the most productive approach. A study conducted across several European countries found that employees who worked six-hour days maintained the same level of output while reporting significantly lower stress levels. Critics argue that shorter workdays could lead to staffing challenges in certain industries.`,
    timeLimit: PART_E_TIME,
    category: 'Business',
    cefrLevel: 'B2'
  },
  // B2+ level
  {
    id: 'e-b2p-1',
    part: 'E',
    text: `The debate over artificial intelligence in healthcare has intensified. Proponents argue that AI can analyze medical images more accurately than human doctors, potentially catching diseases earlier. However, medical professionals caution that AI should complement rather than replace human judgment, particularly when dealing with complex cases that require empathy and nuanced decision-making.`,
    timeLimit: PART_E_TIME,
    category: 'Technology',
    cefrLevel: 'B2+'
  },
  // C1 level
  {
    id: 'e-c1-1',
    part: 'E',
    text: `A comprehensive longitudinal study has revealed that bilingual individuals demonstrate measurably superior cognitive flexibility compared to their monolingual counterparts. The research, which tracked over 2,000 participants across three decades, indicates that regularly switching between languages strengthens neural pathways associated with executive function. Notably, these cognitive advantages appear to persist well into old age, potentially delaying the onset of dementia-related symptoms by several years.`,
    timeLimit: PART_E_TIME,
    category: 'Science',
    cefrLevel: 'C1'
  },
  // C1+ level
  {
    id: 'e-c1p-1',
    part: 'E',
    text: `The intersection of quantum computing and pharmaceutical development represents a paradigm shift in drug discovery. Conventional computational methods, constrained by classical processing limitations, require years to simulate molecular interactions at the atomic level. Quantum algorithms, by contrast, can model these interactions exponentially faster, thereby accelerating the identification of viable drug candidates. Nevertheless, the technology remains nascent, and significant challenges persist regarding error correction and scalability.`,
    timeLimit: PART_E_TIME,
    category: 'Science',
    cefrLevel: 'C1+'
  }
];

// Part F: Opinion Questions (Give your opinion in 40 seconds) - No level adjustment
export const partFQuestions: VersantQuestion[] = [
  {
    id: 'f1',
    part: 'F',
    text: `Some people think that working from home is better than working in an office. What is your opinion?`,
    timeLimit: PART_F_TIME,
    category: 'Work'
  },
  {
    id: 'f2',
    part: 'F',
    text: `Do you think social media has more positive or negative effects on society? Please explain your view.`,
    timeLimit: PART_F_TIME,
    category: 'Technology'
  },
  {
    id: 'f3',
    part: 'F',
    text: `Should students be required to wear uniforms at school? Why or why not?`,
    timeLimit: PART_F_TIME,
    category: 'Education'
  },
  {
    id: 'f4',
    part: 'F',
    text: `Is it better to live in a big city or a small town? What do you prefer and why?`,
    timeLimit: PART_F_TIME,
    category: 'Lifestyle'
  },
  {
    id: 'f5',
    part: 'F',
    text: `Some people prefer to travel alone, while others like to travel with friends or family. Which do you prefer?`,
    timeLimit: PART_F_TIME,
    category: 'Travel'
  },
  {
    id: 'f6',
    part: 'F',
    text: `Do you think it's important to learn a foreign language? Please explain your answer.`,
    timeLimit: PART_F_TIME,
    category: 'Education'
  },
  {
    id: 'f7',
    part: 'F',
    text: `Should companies be required to offer paid parental leave? What is your opinion?`,
    timeLimit: PART_F_TIME,
    category: 'Work'
  },
  {
    id: 'f8',
    part: 'F',
    text: `Is it better to save money or spend it on experiences? What do you think?`,
    timeLimit: PART_F_TIME,
    category: 'Finance'
  },
  {
    id: 'f9',
    part: 'F',
    text: `Do you think online shopping will replace traditional stores in the future? Why or why not?`,
    timeLimit: PART_F_TIME,
    category: 'Shopping'
  },
  {
    id: 'f10',
    part: 'F',
    text: `Should people be required to vote in elections? Please share your thoughts.`,
    timeLimit: PART_F_TIME,
    category: 'Politics'
  },
  {
    id: 'f11',
    part: 'F',
    text: `Is it important for children to learn how to cook? What do you think?`,
    timeLimit: PART_F_TIME,
    category: 'Life Skills'
  },
  {
    id: 'f12',
    part: 'F',
    text: `Do you think electric cars will become more popular than gasoline cars? Why?`,
    timeLimit: PART_F_TIME,
    category: 'Environment'
  },
  {
    id: 'f13',
    part: 'F',
    text: `Should homework be given to students every day? What is your opinion?`,
    timeLimit: PART_F_TIME,
    category: 'Education'
  },
  {
    id: 'f14',
    part: 'F',
    text: `Do you prefer to read books or watch movies? Please explain your preference.`,
    timeLimit: PART_F_TIME,
    category: 'Entertainment'
  },
  {
    id: 'f15',
    part: 'F',
    text: `Is it important to have a healthy work-life balance? How can people achieve this?`,
    timeLimit: PART_F_TIME,
    category: 'Work'
  },
  {
    id: 'f16',
    part: 'F',
    text: `Should fast food be banned in schools? What do you think?`,
    timeLimit: PART_F_TIME,
    category: 'Health'
  },
  {
    id: 'f17',
    part: 'F',
    text: `Do you think robots will take over many jobs in the future? Is this good or bad?`,
    timeLimit: PART_F_TIME,
    category: 'Technology'
  },
  {
    id: 'f18',
    part: 'F',
    text: `Is it better to have a few close friends or many acquaintances? What do you prefer?`,
    timeLimit: PART_F_TIME,
    category: 'Relationships'
  },
  {
    id: 'f19',
    part: 'F',
    text: `Should people reduce their use of plastic? What can individuals do to help?`,
    timeLimit: PART_F_TIME,
    category: 'Environment'
  },
  {
    id: 'f20',
    part: 'F',
    text: `Do you think it's important to follow the news every day? Why or why not?`,
    timeLimit: PART_F_TIME,
    category: 'Media'
  }
];

// Map CEFR levels to groups for question matching
function getLevelGroup(level: CEFRLevel): CEFRLevel[] {
  const groups: Record<string, CEFRLevel[]> = {
    'A1': ['A1'],
    'A1+': ['A1', 'A1+'],
    'A2': ['A2', 'A1+'],
    'A2+': ['A2', 'A2+'],
    'B1': ['B1', 'A2+'],
    'B1+': ['B1', 'B1+'],
    'B2': ['B2', 'B1+'],
    'B2+': ['B2', 'B2+'],
    'C1': ['C1', 'B2+'],
    'C1+': ['C1', 'C1+']
  };
  return groups[level] || ['B1'];
}

// Pick a random item from array, excluding a specific ID
function pickRandom(questions: VersantQuestion[], excludeId?: string): VersantQuestion {
  const candidates = excludeId
    ? questions.filter(q => q.id !== excludeId)
    : questions;

  // If all were excluded (only 1 question available), fall back to full list
  const pool = candidates.length > 0 ? candidates : questions;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

// Get random question by part, optionally filtered by CEFR level (Part E only)
// Pass excludeId to avoid getting the same question twice in a row
export function getRandomQuestion(part: 'E' | 'F', cefrLevel?: CEFRLevel, excludeId?: string): VersantQuestion {
  if (part === 'F') {
    return pickRandom(partFQuestions, excludeId);
  }

  // Part E: filter by CEFR level
  if (cefrLevel) {
    const levelGroup = getLevelGroup(cefrLevel);
    const filtered = partEQuestions.filter(q => q.cefrLevel && levelGroup.includes(q.cefrLevel));
    if (filtered.length > 0) {
      return pickRandom(filtered, excludeId);
    }
  }

  // Fallback: return any Part E question
  return pickRandom(partEQuestions, excludeId);
}

// Get all questions by part
export function getQuestionsByPart(part: 'E' | 'F'): VersantQuestion[] {
  return part === 'E' ? partEQuestions : partFQuestions;
}

// Get question by ID
export function getQuestionById(id: string): VersantQuestion | undefined {
  return [...partEQuestions, ...partFQuestions].find(q => q.id === id);
}
