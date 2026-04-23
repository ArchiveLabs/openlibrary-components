// Pure filter utilities — no DOM, no fetch, fully testable.

export const SORT_OPTIONS = [
  { value: '',               label: 'Relevance' },
  { value: 'new',            label: 'Newest first' },
  { value: 'old',            label: 'Oldest first' },
  { value: 'rating desc',    label: 'Top rated' },
  { value: 'readinglog desc',label: 'Most read' },
  { value: 'title',          label: 'Title A–Z' },
];

export const AVAILABILITY_OPTIONS = [
  { value: '',           label: 'Full Card Catalog',   staticCount: '~50M',  fraction: 1.00 },
  { value: 'readable',   label: 'Readable Books Only', staticCount: '~4.6M', fraction: 0.092 },
  { value: 'borrowable', label: 'Borrowable Only',     staticCount: '~2.7M', fraction: 0.054 },
  { value: 'open',       label: 'Open Access Only',    staticCount: '~1.8M', fraction: 0.036 },
];

export const LANGUAGE_OPTIONS = [
  { value: 'eng', label: 'English' },
  { value: 'spa', label: 'Spanish' },
  { value: 'fre', label: 'French' },
  { value: 'ger', label: 'German' },
  { value: 'ita', label: 'Italian' },
  { value: 'por', label: 'Portuguese' },
  { value: 'chi', label: 'Chinese' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'ara', label: 'Arabic' },
  { value: 'rus', label: 'Russian' },
  { value: 'dut', label: 'Dutch' },
  { value: 'swe', label: 'Swedish' },
  { value: 'nor', label: 'Norwegian' },
  { value: 'dan', label: 'Danish' },
  { value: 'fin', label: 'Finnish' },
  { value: 'pol', label: 'Polish' },
  { value: 'cze', label: 'Czech' },
  { value: 'hun', label: 'Hungarian' },
  { value: 'tur', label: 'Turkish' },
  { value: 'kor', label: 'Korean' },
  { value: 'heb', label: 'Hebrew' },
  { value: 'hin', label: 'Hindi' },
  { value: 'vie', label: 'Vietnamese' },
];

// Fiction/Nonfiction are pinned at the top of the genre dropdown as quasi-radio options.
// They use a separate fictionFilter state field (not the genres[] array).
export const FICTION_OPTIONS = [
  { value: 'fiction',    label: 'Fiction Only' },
  { value: 'nonfiction', label: 'Nonfiction Only' },
];

// Fiction/Nonfiction are excluded from GENRE_OPTIONS — they live in FICTION_OPTIONS above.
export const GENRE_OPTIONS = [
  { value: 'mystery',         label: 'Mystery' },
  { value: 'science fiction', label: 'Science Fiction' },
  { value: 'fantasy',         label: 'Fantasy' },
  { value: 'romance',         label: 'Romance' },
  { value: 'thriller',        label: 'Thriller' },
  { value: 'biography',       label: 'Biography' },
  { value: 'history',         label: 'History' },
  { value: "children's",      label: "Children's" },
  { value: 'poetry',          label: 'Poetry' },
  { value: 'drama',           label: 'Drama' },
  { value: 'short stories',   label: 'Short Stories' },
  { value: 'graphic novels',  label: 'Graphic Novels' },
  { value: 'self-help',       label: 'Self-help' },
  { value: 'science',         label: 'Science' },
  { value: 'travel',          label: 'Travel' },
  { value: 'cooking',         label: 'Cooking' },
];

export const POPULAR_SUBJECTS = [
  'Cooking', 'Computer Science', 'Productivity', 'Dragons', 'Supernatural', 'Detectives',
  'History', 'Philosophy', 'Psychology', 'Mathematics', 'Art', 'Music', 'Travel', 'Nature',
  'Medicine', 'Law', 'Economics', 'Politics', 'Religion', 'Poetry', 'Horror', 'Romance',
  'Adventure', 'Education', 'Business', 'Self-Help', 'Biography', 'Memoir', 'True Crime',
  'Space', 'Ocean', 'Cats', 'Dogs', 'Gardens', 'Architecture', 'Photography', 'Cinema',
  'Theater', 'Dance', 'Sports', 'Chess', 'Yoga', 'Meditation', 'Artificial Intelligence',
  'Climate', 'Astronomy', 'Biology', 'Chemistry', 'Physics', 'Engineering', 'Design',
  'Typography', 'Comics', 'Mythology', 'Folklore', 'Linguistics', 'Anthropology',
  'Archaeology', 'Sociology', 'Feminism', 'Ethics', 'Logic', 'Cryptography', 'Privacy',
  'War', 'Peace', 'Revolution', 'Democracy', 'Capitalism', 'Environment', 'Sustainability',
  'Vegetarian', 'Wine', 'Coffee', 'Magic', 'Ghosts', 'Vampires', 'Zombies', 'Pirates',
  'Vikings', 'Ancient Rome', 'Ancient Egypt', 'Renaissance', 'Industrial Revolution',
  'Cold War', 'World War II', 'Civil War', 'Exploration', 'Espionage', 'Puzzles',
];

export const POPULAR_AUTHORS = [
  'Stephen King', 'J.R.R. Tolkien', 'Agatha Christie', 'Isaac Asimov',
  'Jane Austen', 'Mark Twain', 'Ernest Hemingway', 'George Orwell',
  'J.K. Rowling', 'Neil Gaiman', 'Terry Pratchett', 'Douglas Adams',
  'Philip K. Dick', 'Ursula K. Le Guin', 'Ray Bradbury', 'Arthur C. Clarke',
  'Kurt Vonnegut', 'Franz Kafka', 'Virginia Woolf', 'Toni Morrison',
  'Gabriel García Márquez', 'Haruki Murakami', 'Leo Tolstoy', 'Fyodor Dostoevsky',
  'Charles Dickens', 'Victor Hugo', 'Herman Melville', 'William Faulkner',
  'F. Scott Fitzgerald', 'John Steinbeck', 'Aldous Huxley', 'James Joyce',
  'Edgar Allan Poe', 'H.P. Lovecraft', 'Arthur Conan Doyle', 'Maya Angelou',
  'Langston Hughes', 'W.E.B. Du Bois', 'Frederick Douglass', 'Octavia Butler',
  'Cormac McCarthy', 'Don DeLillo', 'David Foster Wallace', 'Zadie Smith',
  'Chimamanda Ngozi Adichie', 'Kazuo Ishiguro', 'Salman Rushdie', 'Milan Kundera',
];

export const EMPTY_FILTERS = {
  sort:          '',
  availability:  'readable',
  fictionFilter: '',
  languages:     [],
  genres:        [],
  authors:       [],
  subjects:      [],
};

// ── Label helpers ─────────────────────────────────────────────────────────────

export const getLangLabel         = v => LANGUAGE_OPTIONS.find(o => o.value === v)?.label ?? v;
export const getAvailabilityLabel = v => AVAILABILITY_OPTIONS.find(o => o.value === v)?.label ?? v;
export const getGenreLabel        = v => GENRE_OPTIONS.find(o => o.value === v)?.label ?? v;
export const getSortLabel         = v => SORT_OPTIONS.find(o => o.value === v)?.label ?? v;
export const getFictionLabel      = v => FICTION_OPTIONS.find(o => o.value === v)?.label ?? v;

// ── Core operations ───────────────────────────────────────────────────────────

/** Toggle a value into/out of an array without mutation. */
export function toggleArrayValue(arr, value) {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

/** Pick n random elements from arr without mutation (Fisher-Yates). */
export function shufflePick(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * Derive the chip array from a filter state object.
 * Each chip label includes a human-readable "type: value" prefix.
 * Ordering: availability → fictionFilter → language → genre → author → subject
 */
export function buildChips(filters) {
  const chips = [];

  if (filters.availability) {
    chips.push({
      type:  'access',
      label: getAvailabilityLabel(filters.availability),
      value: filters.availability,
    });
  }

  if (filters.fictionFilter) {
    chips.push({
      type:  'fiction',
      label: filters.fictionFilter === 'fiction' ? 'fiction only' : 'nonfiction only',
      value: filters.fictionFilter,
    });
  }

  for (const lang of filters.languages ?? []) {
    chips.push({ type: 'lang', label: `language: ${getLangLabel(lang)}`, value: lang });
  }

  for (const genre of filters.genres ?? []) {
    chips.push({ type: 'genre', label: `genre: ${getGenreLabel(genre)}`, value: genre });
  }

  for (const author of filters.authors ?? []) {
    chips.push({ type: 'author', label: `author: ${author}`, value: author });
  }

  for (const subject of filters.subjects ?? []) {
    chips.push({ type: 'subject', label: `subject: ${subject}`, value: subject });
  }

  return chips;
}

/**
 * Build URLSearchParams for a search request.
 * Multi-value arrays (languages, genres, authors, subjects) are each appended
 * as repeated params; the backend ORs them together within each facet.
 */
export function buildSearchParams(q, filters, page, limit) {
  const p = new URLSearchParams();
  if (q)                    p.set('q', q);
  if (filters.sort)         p.set('sort', filters.sort);
  if (filters.availability) p.set('availability', filters.availability);
  if (filters.fictionFilter) p.set('fictionFilter', filters.fictionFilter);
  for (const v of filters.languages ?? []) p.append('language', v);
  for (const v of filters.genres    ?? []) p.append('genres',   v);
  for (const v of filters.authors   ?? []) p.append('author',   v);
  for (const v of filters.subjects  ?? []) p.append('subjects', v);
  p.set('page',  String(page));
  p.set('limit', String(limit));
  return p;
}

/**
 * Return spoofed per-availability counts based on the total numFound.
 * Replace with real per-category searches once the UX stabilises.
 */
export function spoofAvailabilityCounts(numFound) {
  const counts = {};
  for (const opt of AVAILABILITY_OPTIONS) {
    counts[opt.value] = Math.round(numFound * opt.fraction);
  }
  return counts;
}
