import { Member, Session, Transaction, Conversation, NotificationItem, CurrentUser } from '../types';

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Elena Rostova',
    handle: 'erostova',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    headline: 'Design Systems Architect & Swiss Typography Specialist',
    bio: 'Former principal designer at Studio Zürich. I specialize in scalable design tokens, micro-typography, and building multi-brand design systems that engineers love using.',
    location: 'Zürich, Switzerland',
    timezone: 'CET (UTC+1)',
    rating: 4.96,
    reviewCount: 28,
    hoursTaught: 34,
    hoursLearned: 19,
    skillsTeaching: [
      {
        id: 'sk-1',
        name: 'Design System Architecture & Tokens',
        category: 'Design & Creative',
        proficiency: 'Master',
        description: 'How to structure multi-tiered Figma tokens, sync them with Style Dictionary, and enforce component parity.'
      },
      {
        id: 'sk-2',
        name: 'Grid Systems & Swiss Typography',
        category: 'Design & Creative',
        proficiency: 'Master',
        description: 'Baseline grids, optical kerning, proportional scale ratios, and editorial column math.'
      }
    ],
    skillsLearning: ['Conversational Japanese', 'Analog Film Development', 'Sourdough Fermentation'],
    availability: {
      days: ['Tuesday', 'Thursday', 'Saturday'],
      timeSlot: '17:00 to 20:00 CET',
      preferredCadence: 'Weekly 60m deep dives'
    },
    isSaved: true,
    joinedDate: 'March 2024',
    badges: ['Founding Mentor', 'Top Rated 2026', 'Master Typographer'],
    reviews: [
      {
        id: 'rev-1',
        authorId: 'u-current',
        authorName: 'Ana Silva',
        authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        rating: 5,
        date: '3 days ago',
        comment: 'Elena transformed how I think about modular scales and design tokens. Patient, articulate, and exceptionally rigorous.',
        skillSwapped: 'Design System Architecture',
        duration: '60 min'
      },
      {
        id: 'rev-2',
        authorId: 'm7',
        authorName: 'Marcus Vance',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        rating: 5,
        date: '2 weeks ago',
        comment: 'Worth every second of credit. Solved our token synchronization problems in one single 60m session.',
        skillSwapped: 'Grid Systems & Swiss Typography',
        duration: '60 min'
      }
    ]
  },
  {
    id: 'm2',
    name: 'Kenji Takahashi',
    handle: 'kenjitakahashi',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    headline: 'Master Calligrapher & Conversational Japanese Teacher',
    bio: 'Kyoto-based language tutor and ink artisan. Teaching natural, nuanced Japanese conversational patterns, idiomatic expressions, and brush calligraphy philosophy.',
    location: 'Kyoto, Japan',
    timezone: 'JST (UTC+9)',
    rating: 4.98,
    reviewCount: 41,
    hoursTaught: 52,
    hoursLearned: 38,
    skillsTeaching: [
      {
        id: 'sk-3',
        name: 'Conversational Japanese (Intermediate)',
        category: 'Languages & Writing',
        proficiency: 'Master',
        description: 'Everyday dialogue, keigo nuance, pronunciation rhythm, and contextual listening practice.'
      },
      {
        id: 'sk-4',
        name: 'Shodō (Japanese Brush Calligraphy)',
        category: 'Crafts & Hands-on',
        proficiency: 'Master',
        description: 'Stroke order, ink density, posture, and mindful brushwork mechanics.'
      }
    ],
    skillsLearning: ['Rust Programming', 'Botanical Illustration', 'Acoustic Guitar Fingerpicking'],
    availability: {
      days: ['Monday', 'Wednesday', 'Friday'],
      timeSlot: '09:00 to 13:00 JST',
      preferredCadence: 'Regular bi-weekly exchanges'
    },
    isSaved: true,
    joinedDate: 'January 2024',
    badges: ['Top Rated 2026', 'Community Pillar', 'Polyglot Guild'],
    reviews: [
      {
        id: 'rev-3',
        authorId: 'm4',
        authorName: 'Maya Lin',
        authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        rating: 5,
        date: '1 week ago',
        comment: 'Kenji has an incredible ability to untangle complex grammatical nuance with warmth and clarity.',
        skillSwapped: 'Conversational Japanese',
        duration: '60 min'
      }
    ]
  },
  {
    id: 'm3',
    name: 'Dr. Aris Thorne',
    handle: 'aristhorne',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    headline: 'AI Research Scientist & Python Modeling Mentor',
    bio: 'Computational linguist at Oxford. Specializing in LLM alignment, fine-tuning heuristics, and clear, pragmatic Python algorithms for creative applications.',
    location: 'Oxford, United Kingdom',
    timezone: 'GMT (UTC+0)',
    rating: 4.92,
    reviewCount: 19,
    hoursTaught: 24,
    hoursLearned: 20,
    skillsTeaching: [
      {
        id: 'sk-5',
        name: 'Practical LLM Prompting & Evaluators',
        category: 'Code & Technology',
        proficiency: 'Master',
        description: 'Structuring few-shot evals, latency optimization, and robust schema validation.'
      },
      {
        id: 'sk-6',
        name: 'Python for Creative Coders',
        category: 'Code & Technology',
        proficiency: 'Advanced',
        description: 'Data munging, generative math, NumPy patterns, and vector transformations.'
      }
    ],
    skillsLearning: ['Ceramic Pottery', 'Classical Piano', 'French Wine Terroir'],
    availability: {
      days: ['Monday', 'Thursday'],
      timeSlot: '18:00 to 21:00 GMT',
      preferredCadence: 'Focused 60m problem-solving'
    },
    isSaved: false,
    joinedDate: 'June 2024',
    badges: ['Code Mentor', 'Academic Fellow'],
    reviews: []
  },
  {
    id: 'm4',
    name: 'Maya Lin',
    handle: 'mayalin_craft',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    headline: 'Ceramic Sculptor & Stoneware Glaze Chemist',
    bio: 'Studio potter working out of Portland. Obsessed with high-fire reduction glazes, wood-fired kilns, and the tactile balance of thrown clay vessels.',
    location: 'Portland, Oregon',
    timezone: 'PST (UTC-8)',
    rating: 4.97,
    reviewCount: 33,
    hoursTaught: 48,
    hoursLearned: 31,
    skillsTeaching: [
      {
        id: 'sk-7',
        name: 'Pottery Wheel Centering & Throwing',
        category: 'Crafts & Hands-on',
        proficiency: 'Master',
        description: 'Physical posture, wheel speed management, centering 2-5kg clay, and pulling tall cylinders.'
      },
      {
        id: 'sk-8',
        name: 'Ash Glaze & Oxide Chemistry',
        category: 'Crafts & Hands-on',
        proficiency: 'Advanced',
        description: 'Formulating cones 6-10 glaze recipes, mineral flux calculations, and test tile firing logs.'
      }
    ],
    skillsLearning: ['Figma Design Systems', 'Story Pitching & Editing', 'Urban Permaculture'],
    availability: {
      days: ['Saturday', 'Sunday'],
      timeSlot: '10:00 to 16:00 PST',
      preferredCadence: 'Weekend studio sessions'
    },
    isSaved: true,
    joinedDate: 'February 2024',
    badges: ['Craft Master', 'Studio Guild'],
    reviews: []
  },
  {
    id: 'm5',
    name: 'Tariq Al-Mansoor',
    handle: 'tariqoud',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    headline: 'Oud Virtuoso & Acoustic Guitar Fingerpicking Instructor',
    bio: 'Multi-instrumentalist performing across the Mediterranean. Teaching Eastern maqam theory, quarter-tone fretless expression, and folk fingerpicking patterns.',
    location: 'Istanbul, Turkey',
    timezone: 'TRT (UTC+3)',
    rating: 4.95,
    reviewCount: 22,
    hoursTaught: 29,
    hoursLearned: 18,
    skillsTeaching: [
      {
        id: 'sk-9',
        name: 'Acoustic Guitar Fingerstyle Fundamentals',
        category: 'Music & Sound',
        proficiency: 'Master',
        description: 'Travis picking, thumb independence, percussive slap accents, and open-tuning harmonics.'
      },
      {
        id: 'sk-10',
        name: 'Middle Eastern Maqam Theory',
        category: 'Music & Sound',
        proficiency: 'Master',
        description: 'Microtonal intervals, emotional scales (Bayati, Rast, Hijaz), and improvisational taqsim.'
      }
    ],
    skillsLearning: ['Audio Synthesis in Rust', 'Video Storyboarding', 'Darkroom Photography'],
    availability: {
      days: ['Wednesday', 'Thursday', 'Friday'],
      timeSlot: '14:00 to 18:00 TRT',
      preferredCadence: 'Harmonic practice sessions'
    },
    isSaved: false,
    joinedDate: 'May 2024',
    badges: ['Master Musician', 'Harmonic Guild'],
    reviews: []
  },
  {
    id: 'm6',
    name: 'Chloe Dupuis',
    handle: 'chloedupuis',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    headline: 'Artisan Baker & Wild Yeast Fermentation Naturalist',
    bio: 'Third-generation French baker. Teaching 100% wild levain sourdough, hydration hydration math, grain milling, and long-ferment artisan baguettes at home.',
    location: 'Bordeaux, France',
    timezone: 'CET (UTC+1)',
    rating: 5.0,
    reviewCount: 37,
    hoursTaught: 45,
    hoursLearned: 26,
    skillsTeaching: [
      {
        id: 'sk-11',
        name: 'Sourdough Bread Mastery: Levain to Crumb',
        category: 'Crafts & Hands-on',
        proficiency: 'Master',
        description: 'Starter feeding schedules, coil folds, autolyse timing, steam injection baking, and open crumb structure.'
      },
      {
        id: 'sk-12',
        name: 'French Wine Terroir & Food Pairing',
        category: 'Wellness & Lifestyle',
        proficiency: 'Advanced',
        description: 'Bordeaux and Loire appellations, biodynamic farming notes, and sensory tasting methods.'
      }
    ],
    skillsLearning: ['Conversational German', 'Botanical Watercolor', 'SEO for Independent Makers'],
    availability: {
      days: ['Monday', 'Tuesday', 'Sunday'],
      timeSlot: '15:00 to 19:00 CET',
      preferredCadence: 'Interactive kitchen sessions'
    },
    isSaved: false,
    joinedDate: 'February 2024',
    badges: ['Artisan Baker', 'Top Rated 2026'],
    reviews: []
  },
  {
    id: 'm7',
    name: 'Marcus Vance',
    handle: 'marcusvance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    headline: 'Full-Stack Rust & Web Audio Synthesizer Engineer',
    bio: 'Staff engineer building low-latency DSP audio engines in Rust and WebAssembly. Looking to swap software systems architecture for botanical drawing and storytelling.',
    location: 'Berlin, Germany',
    timezone: 'CET (UTC+1)',
    rating: 4.91,
    reviewCount: 16,
    hoursTaught: 21,
    hoursLearned: 14,
    skillsTeaching: [
      {
        id: 'sk-13',
        name: 'Rust Systems & WebAssembly Interop',
        category: 'Code & Technology',
        proficiency: 'Master',
        description: 'Memory safety semantics, lifetime annotations, and compiling Rust to high-performance WASM.'
      },
      {
        id: 'sk-14',
        name: 'Web Audio API & Modular DSP',
        category: 'Code & Technology',
        proficiency: 'Advanced',
        description: 'Oscillator nodes, custom AudioWorklet processors, envelope shaping, and filter networks.'
      }
    ],
    skillsLearning: ['Botanical Illustration', 'Design Systems', 'Acoustic Guitar'],
    availability: {
      days: ['Wednesday', 'Saturday'],
      timeSlot: '18:00 to 21:00 CET',
      preferredCadence: 'Weekly code review exchanges'
    },
    isSaved: false,
    joinedDate: 'August 2024',
    badges: ['Systems Architect', 'Code Mentor'],
    reviews: []
  },
  {
    id: 'm8',
    name: 'Sofia Alvarez',
    handle: 'sofia_writes',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    headline: 'Investigative Essayist & Narrative Nonfiction Editor',
    bio: 'Published author and magazine editor. Helping writers structure compelling narrative arcs, find their authentic sentence cadence, and trim structural fluff.',
    location: 'Buenos Aires, Argentina',
    timezone: 'ART (UTC-3)',
    rating: 4.94,
    reviewCount: 25,
    hoursTaught: 31,
    hoursLearned: 22,
    skillsTeaching: [
      {
        id: 'sk-15',
        name: 'Narrative Nonfiction & Personal Essays',
        category: 'Languages & Writing',
        proficiency: 'Master',
        description: 'Story pacing, sensory detail selection, narrative voice, and editor pitching techniques.'
      },
      {
        id: 'sk-16',
        name: 'Sentence Architecture & Developmental Editing',
        category: 'Languages & Writing',
        proficiency: 'Master',
        description: 'Line editing, eliminating weak modifiers, rhythmic clauses, and macro structural flow.'
      }
    ],
    skillsLearning: ['Product Strategy', 'Python for Scraping', 'Pranayama Breathwork'],
    availability: {
      days: ['Tuesday', 'Thursday', 'Friday'],
      timeSlot: '11:00 to 15:00 ART',
      preferredCadence: 'Draft review sessions'
    },
    isSaved: false,
    joinedDate: 'April 2024',
    badges: ['Published Author', 'Editor Guild'],
    reviews: []
  },
  {
    id: 'm9',
    name: 'Priya Sharma',
    handle: 'priya_wellness',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    headline: 'Pranayama Breathwork Guide & Ayurvedic Routine Consultant',
    bio: 'Trained in Rishikesh and Kerala. Teaching traditional yogic breath control (Nadi Shodhana, Kapalabhati) and seasonal dinacharya routines for creative workers.',
    location: 'Rishikesh, India',
    timezone: 'IST (UTC+5:30)',
    rating: 4.99,
    reviewCount: 39,
    hoursTaught: 46,
    hoursLearned: 30,
    skillsTeaching: [
      {
        id: 'sk-17',
        name: 'Pranayama & Nervous System Regulation',
        category: 'Wellness & Lifestyle',
        proficiency: 'Master',
        description: 'Diaphragmatic pacing, box breathing, vagus nerve stimulation, and morning energy cultivation.'
      },
      {
        id: 'sk-18',
        name: 'Ayurvedic Dinacharya (Daily Rhythms)',
        category: 'Wellness & Lifestyle',
        proficiency: 'Advanced',
        description: 'Dosha assessment, circadian eating, herbal infusions, and evening digital wind-downs.'
      }
    ],
    skillsLearning: ['UI/UX Wireframing', 'Calligraphy', 'Podcast Production'],
    availability: {
      days: ['Monday', 'Tuesday', 'Friday'],
      timeSlot: '07:00 to 11:00 IST',
      preferredCadence: 'Morning mindful practices'
    },
    isSaved: true,
    joinedDate: 'January 2024',
    badges: ['Wellness Master', 'Pillar Member'],
    reviews: []
  },
  {
    id: 'm10',
    name: 'Lucas Van Der Berg',
    handle: 'lucasfilm',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    headline: '35mm Analog Film Photographer & Darkroom Printer',
    bio: 'Documentary photographer working purely on mechanical cameras and silver gelatin prints. Teaching film metering, chemical development chemistry, and archival printing.',
    location: 'Amsterdam, Netherlands',
    timezone: 'CET (UTC+1)',
    rating: 4.89,
    reviewCount: 15,
    hoursTaught: 18,
    hoursLearned: 12,
    skillsTeaching: [
      {
        id: 'sk-19',
        name: 'Black & White Film Chemistry & Development',
        category: 'Crafts & Hands-on',
        proficiency: 'Master',
        description: 'Rodinal vs D-76 characteristics, agitation intervals, temperature compensation, and drying.'
      },
      {
        id: 'sk-20',
        name: 'Manual Rangefinder Exposure & Metering',
        category: 'Design & Creative',
        proficiency: 'Advanced',
        description: 'Incident light reading, sunny 16 rule, zone system exposure, and framing geometry.'
      }
    ],
    skillsLearning: ['Web Development', 'Conversational Japanese', 'Wild Sourdough'],
    availability: {
      days: ['Saturday', 'Sunday'],
      timeSlot: '13:00 to 17:00 CET',
      preferredCadence: 'Studio darkroom weekends'
    },
    isSaved: false,
    joinedDate: 'September 2024',
    badges: ['Analog Guild'],
    reviews: []
  },
  {
    id: 'm11',
    name: 'Niamh O\'Connor',
    handle: 'niamh_roots',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    headline: 'Urban Permaculture Designer & Heirloom Seed Saver',
    bio: 'Ecologist turning rooftops and concrete balconies into thriving edible ecosystems. Specializing in companion planting, vermicomposting, and native pollinator gardens.',
    location: 'Dublin, Ireland',
    timezone: 'GMT (UTC+0)',
    rating: 4.96,
    reviewCount: 27,
    hoursTaught: 35,
    hoursLearned: 24,
    skillsTeaching: [
      {
        id: 'sk-21',
        name: 'Balcony & Small-Space Permaculture',
        category: 'Wellness & Lifestyle',
        proficiency: 'Master',
        description: 'Vertical trellising, container soil biology, drip micro-irrigation, and shade-tolerant greens.'
      },
      {
        id: 'sk-22',
        name: 'Composting & Living Soil Microbiology',
        category: 'Crafts & Hands-on',
        proficiency: 'Advanced',
        description: 'Carbon-nitrogen balance, worm composting, fungal compost teas, and pest prevention.'
      }
    ],
    skillsLearning: ['Design Systems', 'French Conversation', 'Acoustic Guitar'],
    availability: {
      days: ['Wednesday', 'Saturday'],
      timeSlot: '10:00 to 14:00 GMT',
      preferredCadence: 'Seasonal garden planning'
    },
    isSaved: false,
    joinedDate: 'May 2024',
    badges: ['Eco Mentor', 'Urban Harvest'],
    reviews: []
  },
  {
    id: 'm12',
    name: 'David Kim',
    handle: 'davidkim_strat',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    headline: 'Early-Stage Product Strategist & Pitch Deck Architect',
    bio: 'Former founder and venture advisor in Seoul. Helping creators distill messy product visions into clear value propositions, customer discovery loops, and compelling pitch narratives.',
    location: 'Seoul, South Korea',
    timezone: 'KST (UTC+9)',
    rating: 4.93,
    reviewCount: 30,
    hoursTaught: 38,
    hoursLearned: 29,
    skillsTeaching: [
      {
        id: 'sk-23',
        name: 'Product Vision & 1-Page Strategy Canvas',
        category: 'Business & Strategy',
        proficiency: 'Master',
        description: 'Problem framing, customer persona validation, competitive moat analysis, and positioning.'
      },
      {
        id: 'sk-24',
        name: 'Story-Driven Pitch Decks for Non-Tech Founders',
        category: 'Business & Strategy',
        proficiency: 'Advanced',
        description: '10-slide structure, traction storytelling, unit economics clarity, and investor Q&A prep.'
      }
    ],
    skillsLearning: ['LLM Prompt Engineering', 'Analog Film Photography', 'Pranayama Breathing'],
    availability: {
      days: ['Thursday', 'Friday'],
      timeSlot: '15:00 to 19:00 KST',
      preferredCadence: 'Intense 60m sparring'
    },
    isSaved: false,
    joinedDate: 'March 2024',
    badges: ['Strategy Guild', 'Top Mentor'],
    reviews: []
  }
];

export const INITIAL_CURRENT_USER: CurrentUser = {
  id: 'u-current',
  name: 'Ana Silva',
  handle: 'anasilva',
  email: 'ana.silva@example.com',
  avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
  headline: 'Senior UI/UX Architect & Botanical Watercolorist',
  bio: 'Building intuitive digital platforms with clean typographic hierarchy. In my spare hours, I paint Mediterranean flora with gouache and watercolor. Dedicated to exchanging craft with lifelong learners.',
  location: 'Lisbon, Portugal',
  timezone: 'WET (UTC+0)',
  rating: 4.95,
  reviewCount: 14,
  hoursTaught: 8,
  hoursLearned: 4.5,
  availableCredits: 3.5,
  pendingCredits: 1.0,
  lifetimeCreditsEarned: 8.0,
  lifetimeCreditsSpent: 4.5,
  skillsTeaching: [
    {
      id: 'sk-ana-1',
      name: 'Interactive Prototyping & Micro-interactions',
      category: 'Design & Creative',
      proficiency: 'Master',
      description: 'Crafting fluid state transitions, component states, and physics-based feedback in modern web interfaces.'
    },
    {
      id: 'sk-ana-2',
      name: 'Botanical Watercolor Painting Techniques',
      category: 'Crafts & Hands-on',
      proficiency: 'Advanced',
      description: 'Wet-on-wet leaf gradients, delicate stem line work, and pigment transparency layering.'
    }
  ],
  skillsLearning: ['Conversational Japanese', 'Ceramic Pottery Centering', 'Sourdough Bread Baking'],
  availability: {
    days: ['Monday', 'Wednesday', 'Saturday'],
    timeSlot: '18:00 to 21:00 WET',
    preferredCadence: 'Bi-weekly 60-minute exchanges'
  },
  joinedDate: 'January 2025',
  badges: ['Founding Member', 'Craft Pioneer', '100% Confirmation Rate'],
  reviews: [
    {
      id: 'rev-ana-1',
      authorId: 'm1',
      authorName: 'Elena Rostova',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      rating: 5,
      date: '1 week ago',
      comment: 'Ana has an exquisite eye for motion and micro-interactions. Our exchange was joyful and deeply inspiring!',
      skillSwapped: 'Interactive Prototyping',
      duration: '60 min'
    }
  ],
  notificationPreferences: {
    emailAlerts: true,
    sessionReminders: true,
    creditUpdates: true,
    communityDigest: false
  },
  onboardingCompleted: true,
  onboardingStep: 6
};

export const EMPTY_CURRENT_USER: CurrentUser = {
  id: '',
  name: '',
  handle: '',
  email: '',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  headline: '',
  bio: '',
  location: '',
  timezone: 'UTC',
  rating: 5.0,
  reviewCount: 0,
  hoursTaught: 0,
  hoursLearned: 0,
  availableCredits: 0,
  pendingCredits: 0,
  lifetimeCreditsEarned: 0,
  lifetimeCreditsSpent: 0,
  skillsTeaching: [],
  skillsLearning: [],
  availability: {
    days: ['Monday', 'Wednesday'],
    timeSlot: '18:00 to 21:00 UTC',
    preferredCadence: 'Weekly 60m exchanges',
  },
  joinedDate: 'Just now',
  badges: ['New Member'],
  reviews: [],
  notificationPreferences: {
    emailAlerts: true,
    sessionReminders: true,
    creditUpdates: true,
    communityDigest: false,
  },
  onboardingCompleted: false,
  onboardingStep: 1,
};

export const INITIAL_SESSIONS: Session[] = [
  {
    id: 'sess-1',
    teacherId: 'm2',
    teacherName: 'Kenji Takahashi',
    teacherAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    learnerId: 'u-current',
    learnerName: 'Ana Silva',
    learnerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    skillTitle: 'Conversational Japanese (Intermediate)',
    category: 'Languages & Writing',
    learningGoal: 'Practice keigo speech patterns and ordering food in regional Kansai dialect.',
    durationMinutes: 60,
    creditCost: 1.0,
    scheduledDate: 'Tomorrow at 10:00 JST',
    scheduledTime: '10:00 to 11:00 JST',
    status: 'upcoming',
    teacherConfirmed: false,
    learnerConfirmed: false,
    meetingLink: 'https://meet.timeswap.org/room/kenji-ana-9281',
    messageNotes: 'Please review the kanji flashcards from lesson 2 before the call.',
    createdAt: '2 days ago',
    transferFinalized: false
  },
  {
    id: 'sess-2',
    teacherId: 'm1',
    teacherName: 'Elena Rostova',
    teacherAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    learnerId: 'u-current',
    learnerName: 'Ana Silva',
    learnerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    skillTitle: 'Grid Systems & Swiss Typography',
    category: 'Design & Creative',
    learningGoal: 'Review column baseline grids and modular scale hierarchy for a design system.',
    durationMinutes: 60,
    creditCost: 1.0,
    scheduledDate: 'Yesterday at 18:00 CET',
    scheduledTime: '18:00 to 19:00 CET',
    status: 'pending', // Waiting for 2-way completion!
    teacherConfirmed: true, // Elena has already confirmed!
    learnerConfirmed: false, // Ana needs to confirm to finalize release!
    meetingLink: 'https://meet.timeswap.org/room/elena-ana-4412',
    messageNotes: 'Great session on baseline math. Elena marked her confirmation; waiting for your sign-off.',
    createdAt: '3 days ago',
    completedAt: 'Yesterday',
    transferFinalized: false
  },
  {
    id: 'sess-3',
    teacherId: 'u-current',
    teacherName: 'Ana Silva',
    teacherAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    learnerId: 'm7',
    learnerName: 'Marcus Vance',
    learnerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    skillTitle: 'Botanical Watercolor Painting Techniques',
    category: 'Crafts & Hands-on',
    learningGoal: 'Learn brush pressure control and delicate foliage wash gradients.',
    durationMinutes: 60,
    creditCost: 1,
    scheduledDate: 'Friday, 16:00 WET',
    scheduledTime: '16:00 to 17:00 WET',
    status: 'pending', // Pending request awaiting Ana's acceptance
    teacherConfirmed: false,
    learnerConfirmed: false,
    meetingLink: 'https://meet.timeswap.org/room/ana-marcus-7719',
    messageNotes: 'Looking forward to trying botanical sketching with your feedback!',
    createdAt: '4 hours ago',
    transferFinalized: false
  },
  {
    id: 'sess-4',
    teacherId: 'u-current',
    teacherName: 'Ana Silva',
    teacherAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    learnerId: 'm4',
    learnerName: 'Maya Lin',
    learnerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    skillTitle: 'Interactive Prototyping & Micro-interactions',
    category: 'Design & Creative',
    learningGoal: 'Review tactile mobile gestures and haptic feedback timings.',
    durationMinutes: 60,
    creditCost: 1.0,
    scheduledDate: 'Last week',
    scheduledTime: '17:00 to 18:00 WET',
    status: 'completed',
    teacherConfirmed: true,
    learnerConfirmed: true,
    meetingLink: 'https://meet.timeswap.org/room/ana-maya-1102',
    createdAt: '10 days ago',
    completedAt: 'Last week',
    transferFinalized: true
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: 'Oct 14, 2026',
    type: 'earned',
    amount: 1.0,
    counterpartyId: 'm4',
    counterpartyName: 'Maya Lin',
    counterpartyAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    sessionId: 'sess-4',
    skillTitle: 'Interactive Prototyping (60m)',
    status: 'completed',
    notes: 'Both participants confirmed completion. 1.0 credit released to wallet.'
  },
  {
    id: 'tx-2',
    date: 'Oct 10, 2026',
    type: 'spent',
    amount: 1.0,
    counterpartyId: 'm2',
    counterpartyName: 'Kenji Takahashi',
    counterpartyAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    sessionId: 'sess-old-1',
    skillTitle: 'Conversational Japanese (60m)',
    status: 'completed',
    notes: 'Completed exchange. 1.0 credit transferred to Kenji.'
  },
  {
    id: 'tx-3',
    date: 'Oct 04, 2026',
    type: 'earned',
    amount: 1.5,
    counterpartyId: 'm8',
    counterpartyName: 'Sofia Alvarez',
    counterpartyAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    sessionId: 'sess-old-2',
    skillTitle: 'Interactive Prototyping Deep Dive (90m)',
    status: 'completed',
    notes: 'Two-way confirmed. 1.5 credits credited.'
  },
  {
    id: 'tx-4',
    date: 'Sep 28, 2026',
    type: 'bonus',
    amount: 2.0,
    counterpartyId: 'system',
    counterpartyName: 'TimeSwap Community',
    counterpartyAvatar: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    skillTitle: 'Welcome Community Seed Credit',
    status: 'completed',
    notes: 'Initial starting credit grant to spark your first learning exchange.'
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    participantId: 'm2',
    participantName: 'Kenji Takahashi',
    participantAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    participantHeadline: 'Master Calligrapher & Japanese Teacher',
    lastMessage: 'Looking forward to our session tomorrow! I prepared a few conversational prompts around Kyoto travel.',
    lastMessageTime: '10:45 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-1',
        senderId: 'm2',
        senderName: 'Kenji Takahashi',
        text: 'Konnichiwa Ana! Thank you for scheduling our exchange.',
        timestamp: 'Yesterday at 15:20'
      },
      {
        id: 'msg-2',
        senderId: 'u-current',
        senderName: 'Ana Silva',
        text: 'Hi Kenji! Very excited. I have been practicing hiragana and basic polite phrases, but really want to practice natural conversation.',
        timestamp: 'Yesterday at 16:05'
      },
      {
        id: 'msg-3',
        senderId: 'm2',
        senderName: 'Kenji Takahashi',
        text: 'Looking forward to our session tomorrow! I prepared a few conversational prompts around Kyoto travel.',
        timestamp: '10:45 AM'
      }
    ]
  },
  {
    id: 'conv-2',
    participantId: 'm1',
    participantName: 'Elena Rostova',
    participantAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    participantHeadline: 'Design Systems Architect',
    lastMessage: 'I submitted my confirmation for yesterday’s session. Once you confirm, the credit will finalize!',
    lastMessageTime: 'Yesterday',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-4',
        senderId: 'u-current',
        senderName: 'Ana Silva',
        text: 'Elena, thank you so much for the deep dive on modular scale ratios. That was eye opening.',
        timestamp: 'Yesterday at 19:15'
      },
      {
        id: 'msg-5',
        senderId: 'm1',
        senderName: 'Elena Rostova',
        text: 'I submitted my confirmation for yesterday’s session. Once you confirm, the credit will finalize!',
        timestamp: 'Yesterday at 19:30'
      }
    ]
  },
  {
    id: 'conv-3',
    participantId: 'm7',
    participantName: 'Marcus Vance',
    participantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    participantHeadline: 'Full-Stack Rust Engineer',
    lastMessage: 'Requested a 30m introduction to botanical watercolor washes this Friday.',
    lastMessageTime: '4h ago',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-6',
        senderId: 'm7',
        senderName: 'Marcus Vance',
        text: 'Hey Ana! Saw your watercolor work in the community showcase. Would love a 60m session on brush control.',
        timestamp: '4h ago',
        isProposal: true,
        proposalDetails: {
          skill: 'Botanical Watercolor Painting Techniques',
          duration: '60 min',
          proposedTime: 'Friday at 16:00 WET',
          creditCost: 1
        }
      }
    ]
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'completion_pending',
    title: 'Confirm Session Completion',
    body: 'Elena Rostova marked your "Grid Systems & Swiss Typography" session as complete. Confirm to release 1 credit.',
    timestamp: '2 hours ago',
    isRead: false,
    actionUrl: '/sessions/sess-2/complete',
    creditImpact: -1
  },
  {
    id: 'notif-2',
    type: 'session_request',
    title: 'New Session Request',
    body: 'Marcus Vance requested a 60-minute session on "Botanical Watercolor Painting Techniques".',
    timestamp: '4 hours ago',
    isRead: false,
    actionUrl: '/sessions',
    creditImpact: 1
  },
  {
    id: 'notif-3',
    type: 'credit_transfer',
    title: 'Time Credit Received',
    body: '1.0 time credit was released to your wallet from Maya Lin after mutual confirmation.',
    timestamp: '3 days ago',
    isRead: true,
    actionUrl: '/wallet',
    creditImpact: 1.0
  },
  {
    id: 'notif-4',
    type: 'message',
    title: 'New Message from Kenji',
    body: 'Looking forward to our session tomorrow! I prepared a few conversational prompts...',
    timestamp: '10:45 AM',
    isRead: false,
    actionUrl: '/messages'
  }
];
