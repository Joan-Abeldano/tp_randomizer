const TRAITS = [
    "hotlapper",
    "tyre_whisperer",
    "pay_driver",
    "overtake_artist",
    "mechanic",
    "clean_air_merchant",
    "bottlejob",
    "crash_happy",
    "nervous",
    "tyre_abuser",
    "rainmaster",
    "cautious"
];

const MAX_TRAITS = 2;

const PERSONALITIES = [
    "loyal",
    "ambitious",
    "mercenary",
    "mentor",
    "short_termist",
    "security_seeker",
    "prestigious",
    "impatient",
    "team_player",
    "prima_donna",
    "media_darling",
    "quiet_professional",
    "hot_streaker",
    "comeback_artist",
    "fragile_ego",
    "company_man",
    "glory_hunter"
];

const MIN_PERSONALITIES = 1;
const MAX_PERSONALITIES = 3;

const INCOMPATIBLE = {
    "team_player": ["prima_donna", "glory_hunter"],
    "prima_donna": ["team_player", "quiet_professional", "company_man"],
    "quiet_professional": ["prima_donna", "fragile_ego", "hot_streaker"],
    "fragile_ego": ["quiet_professional", "company_man"],
    "company_man": ["mercenary", "prima_donna", "fragile_ego", "glory_hunter"],
    "mercenary": ["company_man"],
    "short_termist": ["security_seeker"],
    "security_seeker": ["short_termist"],
    "glory_hunter": ["team_player", "company_man"]
};

const STATS_FIELDS = ["cornering", "braking", "consistency", "smoothness", "control"];
const STAT_MIN = 1;
const STAT_MAX = 20;
const TALENT_MIN = 1;
const TALENT_MAX = 99;
const PREF_MIN = 0;
const PREF_MAX = 100;

const DEFAULT_AGE_BRACKETS = [
    { label: "Junior (<18)", min: 0, max: 17, stats: { min: 1, max: 10 } },
    { label: "Rookie (18-22)", min: 18, max: 22, stats: { min: 5, max: 13 } },
    { label: "Racer (23-27)", min: 23, max: 27, stats: { min: 10, max: 16 } },
    { label: "Peak (28-32)", min: 28, max: 32, stats: { min: 12, max: 18 } },
    { label: "Veteran (33-37)", min: 33, max: 37, stats: { min: 10, max: 15 } },
    { label: "Old (38+)", min: 38, max: 200, stats: { min: 7, max: 14 } }
];

window.GameData = {
    TRAITS,
    PERSONALITIES,
    MAX_TRAITS,
    MIN_PERSONALITIES,
    MAX_PERSONALITIES,
    INCOMPATIBLE,
    STATS_FIELDS,
    STAT_MIN,
    STAT_MAX,
    TALENT_MIN,
    TALENT_MAX,
    PREF_MIN,
    PREF_MAX,
    DEFAULT_AGE_BRACKETS
};
