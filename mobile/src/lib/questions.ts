/**
 * Onboarding questions. Plain words, big tap targets, one question per screen.
 * Answers feed the advice (rotation, nutrients) and the warnings.
 */

import type { IconName } from '@/components/ui/icon';

export type Option = { value: string; label: string; icon?: IconName; hint?: string };
export type Question = {
  id: string;
  section: 'Your crops' | 'Your land' | 'Water' | 'Soil' | 'You';
  title: string;
  help?: string;
  multi?: boolean;
  max?: number;
  options: Option[];
};

export const QUESTIONS: Question[] = [
  {
    id: 'rabi_crop',
    section: 'Your crops',
    title: 'What did you grow last winter? (Dec–Apr)',
    options: [
      { value: 'boro', label: 'Boro rice', icon: 'sprout' },
      { value: 'wheat', label: 'Wheat', icon: 'sprout' },
      { value: 'maize', label: 'Maize', icon: 'sprout' },
      { value: 'potato', label: 'Potato', icon: 'harvest' },
      { value: 'mustard', label: 'Mustard', icon: 'leaf' },
      { value: 'veg_winter', label: 'Vegetables', icon: 'leaf' },
      { value: 'none', label: 'Nothing', icon: 'close' },
    ],
  },
  {
    id: 'summer_crop',
    section: 'Your crops',
    title: 'What did you grow in early summer? (Apr–Jul)',
    options: [
      { value: 'aus', label: 'Aus rice', icon: 'sprout' },
      { value: 'jute', label: 'Jute', icon: 'leaf' },
      { value: 'mungbean', label: 'Mungbean', icon: 'leaf' },
      { value: 'veg_summer', label: 'Vegetables', icon: 'leaf' },
      { value: 'none', label: 'Nothing (empty)', icon: 'close' },
    ],
  },
  {
    id: 'aman_crop',
    section: 'Your crops',
    title: 'What did you grow in the rainy season? (Jul–Nov)',
    options: [
      { value: 'aman', label: 'Aman rice', icon: 'sprout' },
      { value: 'none', label: 'Nothing', icon: 'close' },
    ],
  },
  {
    id: 'same_every_year',
    section: 'Your crops',
    title: 'Do you grow the same crops every year?',
    options: [
      { value: 'always', label: 'Yes, always', icon: 'rotation' },
      { value: 'mostly', label: 'Mostly', icon: 'rotation' },
      { value: 'change', label: 'I change often', icon: 'tune' },
    ],
  },
  {
    id: 'yield',
    section: 'Your crops',
    title: 'How was your harvest last year?',
    options: [
      { value: 'better', label: 'Better than usual', icon: 'trendUp' },
      { value: 'normal', label: 'Normal', icon: 'check' },
      { value: 'worse', label: 'Worse than usual', icon: 'trendDown' },
    ],
  },
  {
    id: 'land_type',
    section: 'Your land',
    title: 'What kind of land is your field?',
    help: 'Think about the rainy season.',
    options: [
      { value: 'high', label: 'High land', hint: 'Never under water', icon: 'sun' },
      { value: 'medium_high', label: 'Medium high', hint: 'A little water sometimes', icon: 'sun' },
      { value: 'medium_low', label: 'Medium low', hint: 'Under water most years', icon: 'water' },
      { value: 'low', label: 'Low land', hint: 'Deep water every year', icon: 'water' },
    ],
  },
  {
    id: 'flood',
    section: 'Your land',
    title: 'How often does your field flood?',
    options: [
      { value: 'never', label: 'Never', icon: 'check' },
      { value: 'some', label: 'Some years', icon: 'water' },
      { value: 'most', label: 'Most years', icon: 'water' },
      { value: 'every', label: 'Every year', icon: 'warning' },
    ],
  },
  {
    id: 'drainage',
    section: 'Your land',
    title: 'After heavy rain, how long does water stay?',
    options: [
      { value: 'same_day', label: 'Gone the same day', icon: 'check' },
      { value: 'few_days', label: '1 to 3 days', icon: 'schedule' },
      { value: 'week', label: 'A week or more', icon: 'warning' },
    ],
  },
  {
    id: 'irrigation',
    section: 'Water',
    title: 'Can you water your field in the dry season?',
    options: [
      { value: 'own_pump', label: 'Yes, my own pump', icon: 'water' },
      { value: 'buy_water', label: 'Yes, I buy water', hint: 'From a pump owner', icon: 'water' },
      { value: 'canal', label: 'Only canal or pond', icon: 'water' },
      { value: 'none', label: 'No', icon: 'close' },
    ],
  },
  {
    id: 'water_cost',
    section: 'Water',
    title: 'Is irrigation water costly for you?',
    options: [
      { value: 'high', label: 'Yes, very', icon: 'warning' },
      { value: 'some', label: 'A little', icon: 'balance' },
      { value: 'low', label: 'No', icon: 'check' },
    ],
  },
  {
    id: 'soil_type',
    section: 'Soil',
    title: 'What is your soil like?',
    help: 'Squeeze a handful of wet soil.',
    options: [
      { value: 'sandy', label: 'Sandy', hint: 'Falls apart', icon: 'grid' },
      { value: 'loam', label: 'Loamy', hint: 'Soft, holds shape', icon: 'grid' },
      { value: 'clay', label: 'Clay', hint: 'Sticky, cracks when dry', icon: 'grid' },
      { value: 'unknown', label: 'Not sure', icon: 'info' },
    ],
  },
  {
    id: 'soil_test',
    section: 'Soil',
    title: 'Has your soil been tested?',
    options: [
      { value: 'recent', label: 'Yes, in the last 3 years', icon: 'check' },
      { value: 'old', label: 'Long ago', icon: 'schedule' },
      { value: 'never', label: 'Never', icon: 'close' },
    ],
  },
  {
    id: 'fertilisers',
    section: 'Soil',
    title: 'Which fertilisers do you use?',
    help: 'Choose all that you use.',
    multi: true,
    options: [
      { value: 'urea', label: 'Urea' },
      { value: 'tsp', label: 'TSP' },
      { value: 'mop', label: 'MoP (potash)' },
      { value: 'gypsum', label: 'Gypsum' },
      { value: 'zinc', label: 'Zinc' },
      { value: 'boron', label: 'Boron' },
      { value: 'dung', label: 'Cow dung or compost' },
      { value: 'none', label: 'None' },
    ],
  },
  {
    id: 'straw',
    section: 'Soil',
    title: 'What do you do with straw after harvest?',
    options: [
      { value: 'feed', label: 'Feed my cattle', icon: 'harvest' },
      { value: 'leave', label: 'Leave it in the field', icon: 'leaf' },
      { value: 'burn', label: 'Burn it', icon: 'warning' },
      { value: 'sell', label: 'Sell it', icon: 'balance' },
    ],
  },
  {
    id: 'cattle',
    section: 'You',
    title: 'Do you keep cattle?',
    options: [
      { value: 'yes', label: 'Yes', icon: 'check' },
      { value: 'no', label: 'No', icon: 'close' },
    ],
  },
  {
    id: 'problems',
    section: 'You',
    title: 'What were your biggest problems last year?',
    help: 'Choose all that happened.',
    multi: true,
    options: [
      { value: 'drought', label: 'No rain, dry soil', icon: 'sun' },
      { value: 'flood', label: 'Flood', icon: 'water' },
      { value: 'heat', label: 'Too hot', icon: 'climate' },
      { value: 'heavy_rain', label: 'Too much rain', icon: 'water' },
      { value: 'cold', label: 'Cold nights', icon: 'climate' },
      { value: 'pests', label: 'Insects', icon: 'warning' },
      { value: 'disease', label: 'Plant disease', icon: 'warning' },
      { value: 'price', label: 'Low prices', icon: 'trendDown' },
    ],
  },
  {
    id: 'priorities',
    section: 'You',
    title: 'What matters most to you?',
    help: 'Choose up to two.',
    multi: true,
    max: 2,
    options: [
      { value: 'climate', label: 'Safe from bad weather', icon: 'sun' },
      { value: 'water', label: 'Save water', icon: 'water' },
      { value: 'soil', label: 'Healthy soil', icon: 'leaf' },
      { value: 'income', label: 'More money', icon: 'balance' },
    ],
  },
  {
    id: 'market',
    section: 'You',
    title: 'Can you easily sell new crops at a market?',
    options: [
      { value: 'easy', label: 'Yes, easily', icon: 'check' },
      { value: 'some', label: 'Somewhat', icon: 'balance' },
      { value: 'hard', label: 'Hard to sell', icon: 'close' },
    ],
  },
];

export type Answers = Record<string, string | string[]>;

export const answerOf = (a: Answers, id: string) => (typeof a[id] === 'string' ? (a[id] as string) : undefined);
export const answersOf = (a: Answers, id: string) => (Array.isArray(a[id]) ? (a[id] as string[]) : []);
