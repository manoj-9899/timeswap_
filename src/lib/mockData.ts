import { Member, Session, Transaction, Conversation, NotificationItem, CurrentUser } from '../types';

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Vikramaditya Sengupta',
    handle: 'vikram_design',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    headline: 'Design Systems Architect & Indic Typography Specialist',
    bio: 'Staff design technologist in Kolkata. I specialize in scalable multi-tier Figma tokens, multilingual typography across Devanagari and Latin scripts, and component systems that engineers love building with.',
    location: 'Kolkata, West Bengal',
    timezone: 'IST (UTC+5:30)',
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
        name: 'Multilingual Typography & Grid Systems',
        category: 'Design & Creative',
        proficiency: 'Master',
        description: 'Baseline grids, optical kerning, proportional scale ratios, and bilingual Devanagari-Latin typesetting math.'
      }
    ],
    skillsLearning: ['Carnatic Flute', 'Rust Systems Programming', 'Organic Terracotta Pottery'],
    availability: {
      days: ['Tuesday', 'Thursday', 'Saturday'],
      timeSlot: '17:00 to 20:00 IST',
      preferredCadence: 'Weekly 60m deep dives'
    },
    isSaved: true,
    joinedDate: 'March 2024',
    badges: ['Founding Mentor', 'Top Rated 2026', 'Master Typographer'],
    reviews: [
      {
        id: 'rev-1',
        authorId: 'u-current',
        authorName: 'Ananya Rao',
        authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        rating: 5,
        date: '3 days ago',
        comment: 'Vikram transformed how I think about modular scales and multilingual design tokens. Patient, articulate, and exceptionally rigorous.',
        skillSwapped: 'Design System Architecture',
        duration: '60 min'
      },
      {
        id: 'rev-2',
        authorId: 'm7',
        authorName: 'Aditya Sharma',
        authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
        rating: 5,
        date: '2 weeks ago',
        comment: 'Worth every second of credit. Solved our token synchronization problems in one single 60m session.',
        skillSwapped: 'Multilingual Typography & Grids',
        duration: '60 min'
      }
    ]
  },
  {
    id: 'm2',
    name: 'Arjun Venkatraman',
    handle: 'arjun_flute',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    headline: 'Carnatic Flutist & Conversational Tamil Tutor',
    bio: 'Chennai-based concert flutist and language educator. Teaching swara mechanics, gamaka nuances, raga improvisation, and everyday conversational Tamil for beginners.',
    location: 'Chennai, Tamil Nadu',
    timezone: 'IST (UTC+5:30)',
    rating: 4.98,
    reviewCount: 41,
    hoursTaught: 52,
    hoursLearned: 38,
    skillsTeaching: [
      {
        id: 'sk-3',
        name: 'Carnatic Flute & Swara Improvisation',
        category: 'Music & Sound',
        proficiency: 'Master',
        description: 'Blowing posture, fingering geometry, swara alignment in Mayamalavagowla, and basic gamaka oscillation.'
      },
      {
        id: 'sk-4',
        name: 'Conversational Tamil for Beginners',
        category: 'Languages & Writing',
        proficiency: 'Master',
        description: 'Everyday conversational phrases, polite forms, colloquial sentence cadence, and contextual listening practice.'
      }
    ],
    skillsLearning: ['Rust Systems Programming', 'Botanical Watercolor', 'Acoustic Guitar Fingerpicking'],
    availability: {
      days: ['Monday', 'Wednesday', 'Friday'],
      timeSlot: '09:00 to 13:00 IST',
      preferredCadence: 'Regular bi-weekly exchanges'
    },
    isSaved: false,
    joinedDate: 'January 2024',
    badges: ['Top Rated 2026', 'Community Pillar', 'Classical Artist'],
    reviews: [
      {
        id: 'rev-3',
        authorId: 'm4',
        authorName: 'Meera Nambiar',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        rating: 5,
        date: '1 month ago',
        comment: 'Arjun has an incredible ability to untangle swara geometry and phrasing with warmth, patience, and musical clarity.',
        skillSwapped: 'Carnatic Flute & Swara Improvisation',
        duration: '60 min'
      }
    ]
  },
  {
    id: 'm3',
    name: 'Dr. Rohan Kulkarni',
    handle: 'rohan_ai',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    headline: 'Applied AI Researcher & Python Modeling Guide',
    bio: 'Computational researcher based in Pune. Specializing in LLM alignment, evaluation harnesses, token efficiency, and clear, pragmatic Python algorithms for creative builders.',
    location: 'Pune, Maharashtra',
    timezone: 'IST (UTC+5:30)',
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
    skillsLearning: ['Terracotta Pottery', 'Classical Sitar', 'South Indian Filter Coffee'],
    availability: {
      days: ['Wednesday', 'Sunday'],
      timeSlot: '14:00 to 18:00 IST',
      preferredCadence: 'Monthly deep dive workshops'
    },
    isSaved: false,
    joinedDate: 'April 2024',
    badges: ['Code Mentor', 'Academic Fellow'],
    reviews: []
  },
  {
    id: 'm4',
    name: 'Meera Nambiar',
    handle: 'meera_clay',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    headline: 'Studio Ceramicist & Terracotta Artisan',
    bio: 'Studio potter working out of Kochi. Dedicated to functional stoneware, terracotta wheel throwing, ash glaze chemistry, and the tactile balance of hand-thrown vessels.',
    location: 'Kochi, Kerala',
    timezone: 'IST (UTC+5:30)',
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
        name: 'Terracotta & Natural Ash Glazes',
        category: 'Crafts & Hands-on',
        proficiency: 'Advanced',
        description: 'Formulating cone 6-10 reduction glazes, wood-ash chemistry, and test tile firing logs.'
      }
    ],
    skillsLearning: ['Figma Design Systems', 'Personal Essay Writing', 'Balcony Permaculture'],
    availability: {
      days: ['Thursday', 'Friday', 'Saturday'],
      timeSlot: '10:00 to 15:00 IST',
      preferredCadence: 'Weekly hands-on studio check-in'
    },
    isSaved: false,
    joinedDate: 'February 2024',
    badges: ['Craft Master', 'Studio Guild'],
    reviews: []
  },
  {
    id: 'm5',
    name: 'Kabir Mehta',
    handle: 'kabir_acoustic',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    headline: 'Acoustic Fingerstyle Guitarist & Hindustani Vocalist',
    bio: 'Independent multi-instrumentalist in New Delhi. Teaching fingerstyle acoustic guitar, open tunings, thumb-independence grooves, and fundamental Hindustani vocal swaras.',
    location: 'New Delhi, Delhi-NCR',
    timezone: 'IST (UTC+5:30)',
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
        name: 'Hindustani Vocal Swara Foundations',
        category: 'Music & Sound',
        proficiency: 'Master',
        description: 'Voice culture, breath support, sargam exercises in Bilawal and Yaman, and alap ornamentation.'
      }
    ],
    skillsLearning: ['Audio Synthesis in Rust', 'Video Storyboarding', 'Darkroom Photography'],
    availability: {
      days: ['Monday', 'Tuesday', 'Thursday'],
      timeSlot: '18:00 to 21:00 IST',
      preferredCadence: 'Weekly 60m exchanges'
    },
    isSaved: false,
    joinedDate: 'May 2024',
    badges: ['Master Musician', 'Harmonic Guild'],
    reviews: []
  },
  {
    id: 'm6',
    name: 'Devika Sundaram',
    handle: 'devika_bakes',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    headline: 'Artisan Sourdough Baker & Ancient Grain Fermentation Guide',
    bio: 'Hyderabad-based sourdough baker and fermentation enthusiast. Teaching 100% wild levain sourdough, ancient millet (Ragi, Jowar) hydration math, and artisanal crust development at home.',
    location: 'Hyderabad, Telangana',
    timezone: 'IST (UTC+5:30)',
    rating: 5.0,
    reviewCount: 37,
    hoursTaught: 45,
    hoursLearned: 26,
    skillsTeaching: [
      {
        id: 'sk-11',
        name: 'Sourdough & Ancient Millet Baking',
        category: 'Crafts & Hands-on',
        proficiency: 'Master',
        description: 'Wild levain maintenance, coil folds, ragi-wheat hydration math, steam baking, and open crumb structure.'
      },
      {
        id: 'sk-12',
        name: 'Artisanal Coffee Roasting & South Indian Filter Brew',
        category: 'Wellness & Lifestyle',
        proficiency: 'Advanced',
        description: 'Chikmagalur single-origin estates, roast profiling, chicory ratios, and authentic brass decoction methods.'
      }
    ],
    skillsLearning: ['Conversational German', 'Botanical Watercolor', 'D2C Brand Strategy'],
    availability: {
      days: ['Saturday', 'Sunday'],
      timeSlot: '08:00 to 12:00 IST',
      preferredCadence: 'Weekend bake-along sessions'
    },
    isSaved: false,
    joinedDate: 'January 2024',
    badges: ['Artisan Baker', 'Top Rated 2026'],
    reviews: []
  },
  {
    id: 'm7',
    name: 'Aditya Sharma',
    handle: 'aditya_rust',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    headline: 'Staff Systems Engineer & Embedded Audio Developer',
    bio: 'Systems architect in Bengaluru building high-throughput low-latency audio pipelines with Rust and WebAssembly. Looking to swap backend systems knowledge for botanical drawing and guitar.',
    location: 'Bengaluru, Karnataka',
    timezone: 'IST (UTC+5:30)',
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
      days: ['Wednesday', 'Thursday'],
      timeSlot: '19:00 to 22:00 IST',
      preferredCadence: 'Bi-weekly coding deep dives'
    },
    isSaved: false,
    joinedDate: 'June 2024',
    badges: ['Systems Architect', 'Code Mentor'],
    reviews: []
  },
  {
    id: 'm8',
    name: 'Nandini Sen',
    handle: 'nandini_writes',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    headline: 'Narrative Nonfiction Editor & Personal Essayist',
    bio: 'Literary editor and essayist in Mumbai. Helping writers structure compelling narrative arcs, find authentic sentence cadence, pitch editors, and trim structural clutter.',
    location: 'Mumbai, Maharashtra',
    timezone: 'IST (UTC+5:30)',
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
    skillsLearning: ['D2C Unit Economics', 'Python for Web Scraping', 'Pranayama Breathwork'],
    availability: {
      days: ['Tuesday', 'Friday'],
      timeSlot: '11:00 to 15:00 IST',
      preferredCadence: 'Weekly manuscript reviews'
    },
    isSaved: false,
    joinedDate: 'February 2024',
    badges: ['Published Author', 'Editor Guild'],
    reviews: []
  },
  {
    id: 'm9',
    name: 'Priya Sharma',
    handle: 'priya_wellness',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    headline: 'Pranayama Breathwork Guide & Ayurvedic Routine Consultant',
    bio: 'Trained in Rishikesh and Kerala. Teaching traditional yogic breath control (Nadi Shodhana, Kapalabhati, Bhramari) and seasonal dinacharya routines for knowledge workers.',
    location: 'Rishikesh, Uttarakhand',
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
    skillsLearning: ['UI/UX Wireframing', 'Indic Calligraphy', 'Podcast Audio Production'],
    availability: {
      days: ['Monday', 'Wednesday', 'Friday'],
      timeSlot: '06:30 to 09:30 IST',
      preferredCadence: 'Early morning daily practice check-ins'
    },
    isSaved: false,
    joinedDate: 'November 2023',
    badges: ['Wellness Master', 'Pillar Member'],
    reviews: []
  },
  {
    id: 'm10',
    name: 'Farhan Siddiqui',
    handle: 'farhan_film',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    headline: '35mm Analog Street Photographer & Darkroom Printer',
    bio: 'Documentary and street photographer in Lucknow. Working purely with mechanical film cameras and silver gelatin darkroom prints. Teaching manual rangefinder metering and chemical developing.',
    location: 'Lucknow, Uttar Pradesh',
    timezone: 'IST (UTC+5:30)',
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
        description: 'Rodinal vs D-76 characteristics, agitation intervals, temperature compensation, and archival drying.'
      },
      {
        id: 'sk-20',
        name: 'Manual Rangefinder Exposure & Metering',
        category: 'Design & Creative',
        proficiency: 'Advanced',
        description: 'Incident light reading, sunny 16 rule, zone system exposure, and framing geometry.'
      }
    ],
    skillsLearning: ['Frontend Web Development', 'Conversational Japanese', 'Artisanal Coffee Roasting'],
    availability: {
      days: ['Saturday', 'Sunday'],
      timeSlot: '15:00 to 19:00 IST',
      preferredCadence: 'Bi-weekly darkroom critique'
    },
    isSaved: false,
    joinedDate: 'September 2024',
    badges: ['Analog Guild'],
    reviews: []
  },
  {
    id: 'm11',
    name: 'Kavita Reddy',
    handle: 'kavita_roots',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    headline: 'Urban Permaculture Designer & Native Seed Saver',
    bio: 'Ecologist and terrace gardener in Mysuru. Turning apartment balconies and rooftops into self-sustaining edible ecosystems. Specializing in organic composting, companion planting, and native pollinators.',
    location: 'Mysuru, Karnataka',
    timezone: 'IST (UTC+5:30)',
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
        description: 'Carbon-nitrogen balance, vermicomposting, organic bio-enzymes, and natural pest prevention.'
      }
    ],
    skillsLearning: ['Design Tokens', 'Conversational French', 'Acoustic Guitar'],
    availability: {
      days: ['Wednesday', 'Saturday'],
      timeSlot: '08:00 to 11:00 IST',
      preferredCadence: 'Weekly garden audit'
    },
    isSaved: false,
    joinedDate: 'August 2024',
    badges: ['Eco Mentor', 'Urban Harvest'],
    reviews: []
  },
  {
    id: 'm12',
    name: 'Tanmay Agarwal',
    handle: 'tanmay_strat',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    headline: 'Early-Stage Product Strategist & Pitch Deck Architect',
    bio: 'Former venture-backed founder and angel advisor in Gurugram. Helping Indian creators and tech founders distill messy product visions into clear value propositions, customer discovery loops, and compelling pitch narratives.',
    location: 'Gurugram, Haryana',
    timezone: 'IST (UTC+5:30)',
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
        name: 'Story-Driven Pitch Decks for Founders',
        category: 'Business & Strategy',
        proficiency: 'Advanced',
        description: '10-slide structure, traction storytelling, Indian market unit economics, and investor Q&A prep.'
      }
    ],
    skillsLearning: ['LLM Prompt Engineering', 'Analog Film Photography', 'Yogic Breathwork'],
    availability: {
      days: ['Thursday', 'Friday'],
      timeSlot: '16:00 to 19:00 IST',
      preferredCadence: 'Fortnightly strategy clinics'
    },
    isSaved: false,
    joinedDate: 'October 2023',
    badges: ['Strategy Guild', 'Top Mentor'],
    reviews: []
  }
];

export const INITIAL_CURRENT_USER: CurrentUser = {
  id: 'u-current',
  name: 'Ananya Rao',
  handle: 'ananyarao',
  email: 'ananya.rao@example.com',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  headline: 'Principal Product Designer & Botanical Artist',
  bio: 'Building intuitive digital platforms with clean typographic systems and tactile interaction design. In my spare hours, I paint South Indian flora with gouache and watercolor. Dedicated to exchanging craft with lifelong learners.',
  location: 'Bengaluru, Karnataka',
  timezone: 'IST (UTC+5:30)',
  rating: 4.95,
  reviewCount: 14,
  hoursTaught: 8,
  hoursLearned: 4,
  availableCredits: 4,
  pendingCredits: 1,
  lifetimeCreditsEarned: 8,
  lifetimeCreditsSpent: 4,
  skillsTeaching: [
    {
      id: 'sk-ana-1',
      name: 'Interactive Prototyping & Motion Design',
      category: 'Design & Creative',
      proficiency: 'Master',
      description: 'Crafting fluid state transitions, component physics, and micro-interactions in modern web interfaces.'
    },
    {
      id: 'sk-ana-2',
      name: 'Botanical Watercolor & Gouache Painting',
      category: 'Crafts & Hands-on',
      proficiency: 'Advanced',
      description: 'Wet-on-wet leaf gradients, delicate stem line work, and pigment layering inspired by Indian flora.'
    }
  ],
  skillsLearning: ['Conversational Tamil', 'Blue Pottery Centering', 'Sourdough & Ancient Millets'],
  availability: {
    days: ['Monday', 'Wednesday', 'Saturday'],
    timeSlot: '18:00 to 21:00 IST',
    preferredCadence: 'Bi-weekly 60-minute exchanges'
  },
  joinedDate: 'January 2025',
  badges: ['Founding Member', 'Craft Pioneer', '100% Confirmation Rate'],
  reviews: [
    {
      id: 'rev-ana-1',
      authorId: 'm1',
      authorName: 'Vikramaditya Sengupta',
      authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
      rating: 5,
      date: '1 week ago',
      comment: 'Ananya has an exquisite eye for motion and micro-interactions. Our exchange was joyful and deeply inspiring!',
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
  timezone: 'IST (UTC+5:30)',
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
    timeSlot: '18:00 to 21:00 IST',
    preferredCadence: 'Weekly 60m exchanges'
  },
  joinedDate: 'Just now',
  badges: ['New Member'],
  reviews: [],
  notificationPreferences: {
    emailAlerts: true,
    sessionReminders: true,
    creditUpdates: true,
    communityDigest: false
  },
  onboardingCompleted: false,
  onboardingStep: 1
};

export const INITIAL_SESSIONS: Session[] = [
  {
    id: 'sess-1',
    teacherId: 'm2',
    teacherName: 'Arjun Venkatraman',
    teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    learnerId: 'u-current',
    learnerName: 'Ananya Rao',
    learnerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    skillTitle: 'Carnatic Flute & Swara Improvisation',
    category: 'Music & Sound',
    learningGoal: 'Practice fundamental swara intervals and gamaka oscillations in Mayamalavagowla.',
    durationMinutes: 60,
    creditCost: 1,
    scheduledDate: 'Tomorrow at 10:00 IST',
    scheduledTime: '10:00 to 11:00 IST',
    status: 'upcoming',
    teacherConfirmed: false,
    learnerConfirmed: false,
    meetingLink: 'https://meet.timeswap.org/room/arjun-ananya-9281',
    messageNotes: 'Please review the swara exercise sheet from lesson 1 before our call.',
    createdAt: '2 days ago',
    transferFinalized: false
  },
  {
    id: 'sess-2',
    teacherId: 'm1',
    teacherName: 'Vikramaditya Sengupta',
    teacherAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    learnerId: 'u-current',
    learnerName: 'Ananya Rao',
    learnerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    skillTitle: 'Multilingual Typography & Grid Systems',
    category: 'Design & Creative',
    learningGoal: 'Review baseline grids and bilingual scale hierarchy for an Indic web design system.',
    durationMinutes: 60,
    creditCost: 1,
    scheduledDate: 'Yesterday at 18:00 IST',
    scheduledTime: '18:00 to 19:00 IST',
    status: 'pending',
    teacherConfirmed: true,
    learnerConfirmed: false,
    meetingLink: 'https://meet.timeswap.org/room/vikram-ananya-4412',
    messageNotes: 'Great session on baseline math and font pairing. Vikram marked his confirmation; waiting for your sign-off.',
    createdAt: '3 days ago',
    completedAt: 'Yesterday',
    transferFinalized: false
  },
  {
    id: 'sess-3',
    teacherId: 'u-current',
    teacherName: 'Ananya Rao',
    teacherAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    learnerId: 'm7',
    learnerName: 'Aditya Sharma',
    learnerAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    skillTitle: 'Botanical Watercolor & Gouache Painting',
    category: 'Crafts & Hands-on',
    learningGoal: 'Learn brush pressure control and delicate foliage wash gradients.',
    durationMinutes: 60,
    creditCost: 1,
    scheduledDate: 'Friday, 16:00 IST',
    scheduledTime: '16:00 to 17:00 IST',
    status: 'pending',
    teacherConfirmed: false,
    learnerConfirmed: false,
    meetingLink: 'https://meet.timeswap.org/room/ananya-aditya-7719',
    messageNotes: 'Looking forward to trying botanical sketching with your feedback!',
    createdAt: '4 hours ago',
    transferFinalized: false
  },
  {
    id: 'sess-4',
    teacherId: 'u-current',
    teacherName: 'Ananya Rao',
    teacherAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    learnerId: 'm4',
    learnerName: 'Meera Nambiar',
    learnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    skillTitle: 'Interactive Prototyping & Motion Design',
    category: 'Design & Creative',
    learningGoal: 'Review tactile mobile gestures and haptic feedback timings.',
    durationMinutes: 60,
    creditCost: 1,
    scheduledDate: 'Last week',
    scheduledTime: '17:00 to 18:00 IST',
    status: 'completed',
    teacherConfirmed: true,
    learnerConfirmed: true,
    meetingLink: 'https://meet.timeswap.org/room/ananya-meera-1102',
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
    amount: 1,
    counterpartyId: 'm4',
    counterpartyName: 'Meera Nambiar',
    counterpartyAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    sessionId: 'sess-4',
    skillTitle: 'Interactive Prototyping (60m)',
    status: 'completed',
    notes: 'Both participants confirmed completion. 1 credit released to wallet.'
  },
  {
    id: 'tx-2',
    date: 'Oct 10, 2026',
    type: 'spent',
    amount: 1,
    counterpartyId: 'm2',
    counterpartyName: 'Arjun Venkatraman',
    counterpartyAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    sessionId: 'sess-old-1',
    skillTitle: 'Carnatic Flute Foundations (60m)',
    status: 'completed',
    notes: 'Completed exchange. 1 credit transferred to Arjun.'
  },
  {
    id: 'tx-3',
    date: 'Oct 04, 2026',
    type: 'earned',
    amount: 2,
    counterpartyId: 'm8',
    counterpartyName: 'Nandini Sen',
    counterpartyAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    sessionId: 'sess-old-2',
    skillTitle: 'Interactive Prototyping Deep Dive (120m)',
    status: 'completed',
    notes: 'Two-way confirmed. 2 credits credited.'
  },
  {
    id: 'tx-4',
    date: 'Sep 28, 2026',
    type: 'bonus',
    amount: 3,
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
    participantName: 'Arjun Venkatraman',
    participantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    participantHeadline: 'Carnatic Flutist & Tamil Tutor',
    lastMessage: 'Looking forward to our session tomorrow! I prepared a few raga phrases and fingering exercises.',
    lastMessageTime: '10:45 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-1',
        senderId: 'm2',
        senderName: 'Arjun Venkatraman',
        text: 'Namaskaram Ananya! Thank you for scheduling our exchange.',
        timestamp: 'Yesterday at 15:20'
      },
      {
        id: 'msg-2',
        senderId: 'u-current',
        senderName: 'Ananya Rao',
        text: 'Hi Arjun! Very excited. I have been practicing the basic fingerings, but really want to practice steady swara breath control.',
        timestamp: 'Yesterday at 16:05'
      },
      {
        id: 'msg-3',
        senderId: 'm2',
        senderName: 'Arjun Venkatraman',
        text: 'Looking forward to our session tomorrow! I prepared a few raga phrases and fingering exercises.',
        timestamp: '10:45 AM'
      }
    ]
  },
  {
    id: 'conv-2',
    participantId: 'm1',
    participantName: 'Vikramaditya Sengupta',
    participantAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    participantHeadline: 'Design Systems Architect',
    lastMessage: 'I submitted my confirmation for yesterday’s session. Once you confirm, the credit will finalize!',
    lastMessageTime: 'Yesterday',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-4',
        senderId: 'u-current',
        senderName: 'Ananya Rao',
        text: 'Vikram, thank you so much for the deep dive on bilingual font pairing and scale ratios. That was eye opening.',
        timestamp: 'Yesterday at 19:15'
      },
      {
        id: 'msg-5',
        senderId: 'm1',
        senderName: 'Vikramaditya Sengupta',
        text: 'I submitted my confirmation for yesterday’s session. Once you confirm, the credit will finalize!',
        timestamp: 'Yesterday at 19:30'
      }
    ]
  },
  {
    id: 'conv-3',
    participantId: 'm7',
    participantName: 'Aditya Sharma',
    participantAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    participantHeadline: 'Staff Systems Engineer',
    lastMessage: 'Requested a 60m introduction to botanical watercolor washes this Friday.',
    lastMessageTime: '4h ago',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-6',
        senderId: 'm7',
        senderName: 'Aditya Sharma',
        text: 'Hey Ananya! Saw your botanical artwork in the community showcase. Would love a 60m session on brush control and leaf wash gradients.',
        timestamp: '4h ago',
        isProposal: true,
        proposalDetails: {
          skill: 'Botanical Watercolor & Gouache Painting',
          duration: '60 min',
          proposedTime: 'Friday at 16:00 IST',
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
    body: 'Vikramaditya Sengupta marked your "Multilingual Typography & Grid Systems" session as complete. Confirm to release 1 credit.',
    timestamp: '2 hours ago',
    isRead: false,
    actionUrl: '/sessions/sess-2/complete',
    creditImpact: -1
  },
  {
    id: 'notif-2',
    type: 'session_request',
    title: 'New Session Request',
    body: 'Aditya Sharma requested a 60-minute session on "Botanical Watercolor & Gouache Painting".',
    timestamp: '4 hours ago',
    isRead: false,
    actionUrl: '/sessions',
    creditImpact: 1
  },
  {
    id: 'notif-3',
    type: 'credit_transfer',
    title: 'Time Credit Received',
    body: '1 time credit was released to your wallet from Meera Nambiar after mutual confirmation.',
    timestamp: '3 days ago',
    isRead: true,
    actionUrl: '/wallet',
    creditImpact: 1
  },
  {
    id: 'notif-4',
    type: 'message',
    title: 'New Message from Arjun',
    body: 'Looking forward to our session tomorrow! I prepared a few raga phrases...',
    timestamp: '10:45 AM',
    isRead: false,
    actionUrl: '/messages'
  }
];
