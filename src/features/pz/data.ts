/** Static Project Zomboid (Build 42.21 Stable, multiplayer) checklist content. */

export const ROLES = ["Leader", "Scout", "Builder", "Mechanic", "Medic", "Farmer", "Cook", "Anyone"] as const;
export type Role = (typeof ROLES)[number];

export type Priority = "critical" | "high" | "normal";

export type Item = { id: string; title: string; note?: string; priority: Priority; role: Role };
export type Section = { id: string; title: string; blurb: string; items: Item[] };

const i = (id: string, title: string, priority: Priority, role: Role, note?: string): Item =>
  note ? { id, title, priority, role, note } : { id, title, priority, role };

export const SECTIONS: Section[] = [
  {
    id: "outbreak",
    title: "Initial Outbreak",
    blurb: "Survive the first hours. Regroup, stay quiet, grab essentials.",
    items: [
      i("ob-regroup", "Regroup with the whole party in one building", "critical", "Leader"),
      i("ob-bag", "Everyone has a bag (school bag minimum)", "critical", "Anyone"),
      i("ob-weapon", "Everyone carries a blunt weapon + a spare", "critical", "Anyone"),
      i("ob-water", "Fill every bottle and pot while water still runs", "critical", "Cook"),
      i("ob-food", "Loot non-perishable food from the nearest houses", "high", "Scout"),
      i("ob-quiet", "Agree on noise rules: no sprinting, no shooting in town", "high", "Leader"),
      i("ob-tv", "Watch Life & Living TV every day for free XP", "normal", "Anyone"),
    ],
  },
  {
    id: "safehouse",
    title: "Safehouse",
    blurb: "One defensible base with clear storage and sleeping spots.",
    items: [
      i("sh-claim", "Pick an edge-of-town / river-side house and claim it", "critical", "Leader"),
      i("sh-clear", "Clear the house and the yard; check every room", "critical", "Scout"),
      i("sh-curtains", "Curtains or sheets on every window", "high", "Builder"),
      i("sh-storage", "Labelled storage: food / meds / tools / ammo / books", "high", "Builder"),
      i("sh-beds", "A bed for every player", "normal", "Anyone"),
      i("sh-rain", "Rain collector barrels built", "high", "Builder"),
    ],
  },
  {
    id: "supply",
    title: "Supply Network",
    blurb: "Know where things are and loot systematically.",
    items: [
      i("sp-map", "Mark looted houses and key shops on the map", "high", "Scout"),
      i("sp-books", "Collect skill books for every role (vol. 1–5)", "critical", "Scout"),
      i("sp-mags", "Find key magazines: generator, farming, fishing, trapping", "critical", "Scout"),
      i("sp-tools", "Hammer, saw, screwdriver, wrench, axe, sledgehammer", "high", "Builder"),
      i("sp-fallback", "Fallback cache with food, water and a weapon", "high", "Leader"),
    ],
  },
  {
    id: "vehicles",
    title: "Vehicles",
    blurb: "From first car to a 3-role fleet.",
    items: [
      i("vh-first", "First working vehicle with keys", "critical", "Mechanic"),
      i("vh-fuel", "Gas cans + siphon routine", "critical", "Mechanic"),
      i("vh-second", "Second vehicle as backup", "high", "Mechanic"),
      i("vh-fleet", "Fleet: hauler (van/truck), scout car, convoy vehicle", "high", "Mechanic"),
      i("vh-service", "Spare tyres, battery, brakes for each vehicle", "normal", "Mechanic"),
    ],
  },
  {
    id: "power",
    title: "Power & Water",
    blurb: "Be ready before the shutoff.",
    items: [
      i("pw-gen", "Generator + generator magazine read", "critical", "Mechanic"),
      i("pw-gas", "At least 100 units of fuel stockpiled", "critical", "Mechanic"),
      i("pw-water", "Water stored: barrels + filled containers", "critical", "Cook"),
      i("pw-test", "Generator test run outside the house, not in a garage", "high", "Mechanic", "Generators in enclosed spaces cause carbon monoxide poisoning."),
      i("pw-purify", "Water purification routine (boil or tablets)", "high", "Cook"),
    ],
  },
  {
    id: "food",
    title: "Food Security",
    blurb: "From looting to a renewable kitchen.",
    items: [
      i("fd-pantry", "Pantry: 2 weeks of canned food", "critical", "Cook"),
      i("fd-fridge", "Freezer running on generator", "high", "Cook"),
      i("fd-fishing", "Fishing rod + tackle; fishing spot near base", "high", "Farmer"),
      i("fd-forage", "Foraging trips with a basket", "normal", "Farmer"),
      i("fd-preserve", "Jars + canning for long-term storage", "high", "Cook"),
    ],
  },
  {
    id: "workshop",
    title: "Workshop & Crafting",
    blurb: "Build, repair and craft at a proper workbench.",
    items: [
      i("ws-bench", "Carpentry workbench area", "high", "Builder"),
      i("ws-metal", "Metalworking: propane torch + welding mask", "normal", "Builder"),
      i("ws-tailor", "Tailoring station with needles and thread", "normal", "Medic"),
      i("ws-repair", "Weapon repair routine (glue, tape, wood)", "normal", "Builder"),
    ],
  },
  {
    id: "farming",
    title: "Farming & Animals",
    blurb: "Renewable food.",
    items: [
      i("fa-seeds", "Seeds for at least 5 crops", "critical", "Farmer"),
      i("fa-plots", "Fenced farm plots near water", "high", "Farmer"),
      i("fa-compost", "Compost bin", "normal", "Farmer"),
      i("fa-livestock", "First livestock (chickens) with a pen and feed", "high", "Farmer"),
      i("fa-calendar", "Planting calendar respected (season-aware)", "normal", "Farmer"),
    ],
  },
  {
    id: "medical",
    title: "Medical & Clothing",
    blurb: "Keep everyone patched and dressed for the weather.",
    items: [
      i("md-kit", "Medkit per player: bandages, disinfectant, painkillers", "critical", "Medic"),
      i("md-books", "First Aid books read by the medic", "high", "Medic"),
      i("md-antibiotics", "Antibiotics stockpile", "high", "Medic"),
      i("md-armor", "Bite-protective clothing: leather jacket, padded pants", "high", "Anyone"),
      i("md-spare", "Spare clothes for each player", "normal", "Anyone"),
    ],
  },
  {
    id: "fortification",
    title: "Fortification",
    blurb: "Make the base hold.",
    items: [
      i("ft-ground", "Ground floor windows barricaded", "high", "Builder"),
      i("ft-stairs", "Sheet-rope or removable stairs to upper floor", "normal", "Builder"),
      i("ft-walls", "Log or wood walls around the yard", "high", "Builder"),
      i("ft-gate", "Gate wide enough for vehicles", "normal", "Builder"),
    ],
  },
  {
    id: "exploration",
    title: "Exploration",
    blurb: "Expand safely beyond the first town.",
    items: [
      i("ex-route", "Plan routes with fallback points", "high", "Scout"),
      i("ex-forward", "Forward safehouse in a second town", "high", "Leader"),
      i("ex-convoy", "Convoy runs: two vehicles, radio contact", "normal", "Leader"),
      i("ex-highrisk", "High-risk runs (malls, military) only with full kit", "normal", "Scout"),
    ],
  },
  {
    id: "winter",
    title: "Winter Prep",
    blurb: "Winter kills sloppy groups.",
    items: [
      i("wn-clothes", "Winter clothes for every player", "critical", "Anyone"),
      i("wn-food", "Food for a full winter (no harvest)", "critical", "Cook"),
      i("wn-fuel", "Fuel for generator + vehicles through winter", "critical", "Mechanic"),
      i("wn-test", "Water and power full test before first snow", "high", "Mechanic"),
      i("wn-fleet", "Fleet serviced: tyres, battery, fuel", "high", "Mechanic"),
      i("wn-heat", "Heating source: fireplace / stove + firewood", "high", "Builder"),
    ],
  },
  {
    id: "community",
    title: "Community",
    blurb: "Roles, routines and redundancy.",
    items: [
      i("cm-roles", "Every role has a main and a backup player", "critical", "Leader"),
      i("cm-schedule", "Daily routine: who loots, who farms, who guards", "high", "Leader"),
      i("cm-comms", "Radios / walkie-talkies for every player", "normal", "Scout"),
      i("cm-log", "Shared log of deaths, lessons and stockpiles", "normal", "Leader"),
    ],
  },
  {
    id: "endgame",
    title: "Community Established",
    blurb: "Custom endgame: the group is self-sufficient.",
    items: [
      i("eg-winter", "First winter survived", "critical", "Leader"),
      i("eg-renewable", "Renewable water and food", "critical", "Farmer"),
      i("eg-power", "Reliable power without daily babysitting", "critical", "Mechanic"),
      i("eg-multi", "Multiple safehouses stocked", "high", "Leader"),
      i("eg-redundancy", "Role redundancy proven (anyone can cover)", "high", "Leader"),
    ],
  },
];

export const CHALLENGES: Item[] = [
  i("ch-nodeath", "One in-game week with zero party deaths", "normal", "Anyone"),
  i("ch-walk", "Cross Knox County on foot", "normal", "Scout"),
  i("ch-vegan", "Survive a month on farmed food only", "normal", "Farmer"),
  i("ch-silent", "Loot a whole town without firing a shot", "normal", "Scout"),
  i("ch-mall", "Clear the Louisville mall entrance", "normal", "Leader"),
  i("ch-horde", "Survive a helicopter event without losing anyone", "normal", "Anyone"),
];

export type Phase = { id: string; when: string; title: string; steps: string[]; gate: string };

/** Separate from the main completion percentage. */
export const EASIEST_RUN = {
  setup: ["Rising preset", "Riverside start", "First base: edge of town, next to the river"],
  phases: [
    {
      id: "p0",
      when: "0–24h",
      title: "Regroup + essentials",
      steps: ["Meet up", "Bags + weapons", "Fill water", "Nearby food"],
      gate: "Everyone is together, armed, with a bag and water.",
    },
    {
      id: "p1",
      when: "Days 2–3",
      title: "Storage, books, first vehicle",
      steps: ["Organized storage", "Skill books per role", "First vehicle with keys"],
      gate: "Labelled storage exists and one vehicle runs.",
    },
    {
      id: "p2",
      when: "Days 4–7",
      title: "Generator, water, fuel",
      steps: ["Generator + magazine", "Water barrels", "Fuel stockpile"],
      gate: "You could survive the water and power shutoff tomorrow.",
    },
    {
      id: "p3",
      when: "Week 2",
      title: "Food loop + backups",
      steps: ["Farming started", "Fishing / foraging", "Second vehicle", "Fallback cache"],
      gate: "Food comes in without looting, and there is a backup car + cache.",
    },
    {
      id: "p4",
      when: "Weeks 3–4",
      title: "Workshops, medical, livestock, fleet",
      steps: ["Workbenches", "Medical station", "Livestock", "3-role vehicle fleet"],
      gate: "Hauler, scout and convoy vehicles all run; the medic is equipped.",
    },
    {
      id: "p5",
      when: "Month 2+",
      title: "Expand",
      steps: ["Forward safehouse", "Convoy runs", "High-risk runs"],
      gate: "A second safehouse is stocked before any high-risk run.",
    },
    {
      id: "p6",
      when: "Pre-winter",
      title: "Winter prep",
      steps: ["Winter clothes", "Winter food", "Fuel", "Water/power test", "Fleet service"],
      gate: "The full water/power test passed and everyone has winter clothes.",
    },
    {
      id: "p7",
      when: "Finish",
      title: "Community Established",
      steps: [
        "First winter survived",
        "Renewable water/food",
        "Reliable power",
        "Multiple safehouses",
        "Role redundancy",
      ],
      gate: "All five are true at once. Congratulations, survivors.",
    },
  ] as Phase[],
};

export const ALL_ITEMS: Item[] = SECTIONS.flatMap((s) => s.items);
