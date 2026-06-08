export type CropGuide = {
  crop: string;
  season: string;
  sowing: string;
  transplanting?: string;
  harvest: string;
  water: string;
  fertilizer: string;
  pests: string[];
  stress: string;
  economics: string;
  stages: string[];
  keywords: string[];
};

export const cropGuides: CropGuide[] = [
  {
    crop: "Rice",
    season: "Kharif",
    sowing: "June to July after monsoon onset",
    harvest: "October to November",
    water: "Keep soil moist; avoid deep standing water after tillering.",
    fertilizer: "Use farmyard manure before puddling, split nitrogen at transplanting, tillering, and panicle initiation.",
    pests: ["stem borer", "brown planthopper", "leaf folder", "blast"],
    stress: "Drain after heavy rainfall and watch blast during cloudy humid weather.",
    economics: "High staple demand; quality grain and timely drying improve price.",
    stages: ["Nursery", "Transplanting", "Tillering", "Panicle initiation", "Grain filling", "Harvest"],
    keywords: ["rice", "paddy", "dhan", "blast", "planthopper"]
  },
  {
    crop: "Wheat",
    season: "Rabi",
    sowing: "Late October to November",
    harvest: "March to April",
    water: "Irrigate at crown root initiation, tillering, booting, flowering, and grain filling.",
    fertilizer: "Apply phosphorus and potassium at sowing; split nitrogen between sowing and first irrigation.",
    pests: ["rust", "aphid", "termite", "loose smut"],
    stress: "Heat after grain filling reduces yield; avoid late sowing where possible.",
    economics: "Strong procurement pathways in North India; grain moisture affects acceptance.",
    stages: ["Germination", "Crown root initiation", "Tillering", "Booting", "Flowering", "Grain filling"],
    keywords: ["wheat", "gehun", "rust", "aphid"]
  },
  {
    crop: "Cotton",
    season: "Kharif",
    sowing: "May to July depending on irrigation and rainfall",
    harvest: "October to January in multiple pickings",
    water: "Avoid waterlogging; drip irrigation improves boll retention.",
    fertilizer: "Use balanced NPK with micronutrients; add potassium during flowering and boll formation.",
    pests: ["pink bollworm", "whitefly", "jassid", "mealybug"],
    stress: "Hot dry wind and water stress during flowering can cause flower and boll drop.",
    economics: "Fiber quality, clean picking, and moisture control affect farmgate value.",
    stages: ["Squaring", "Flowering", "Boll formation", "Boll opening", "Picking"],
    keywords: ["cotton", "kapas", "bollworm", "whitefly"]
  },
  {
    crop: "Tomato",
    season: "Year-round with local heat and frost protection",
    sowing: "Nursery 25 to 30 days before transplanting",
    harvest: "70 to 90 days after transplanting",
    water: "Maintain even moisture; mulch to reduce blossom-end rot and heat stress.",
    fertilizer: "Compost plus balanced NPK; calcium and boron help fruit quality.",
    pests: ["fruit borer", "leaf miner", "early blight", "bacterial wilt"],
    stress: "High humidity favors blight; heat above 35 C reduces fruit set.",
    economics: "Market price is volatile; stagger planting and grade fruit for better returns.",
    stages: ["Nursery", "Transplanting", "Vegetative growth", "Flowering", "Fruit set", "Harvest"],
    keywords: ["tomato", "tamatar", "blight", "fruit borer"]
  },
  {
    crop: "Chickpea",
    season: "Rabi",
    sowing: "October to November",
    harvest: "February to March",
    water: "Usually rainfed; one irrigation at flowering can improve yield if soil is dry.",
    fertilizer: "Rhizobium seed treatment, phosphorus at sowing, and organic matter improve nodulation.",
    pests: ["pod borer", "wilt", "cutworm"],
    stress: "Avoid excess irrigation; waterlogging increases wilt and root disease.",
    economics: "Useful pulse rotation crop; residue improves soil nitrogen balance.",
    stages: ["Germination", "Branching", "Flowering", "Pod formation", "Maturity"],
    keywords: ["chickpea", "gram", "chana", "pod borer"]
  },
  {
    crop: "Maize",
    season: "Kharif, Spring",
    sowing: "June to July for kharif; February for spring maize",
    harvest: "85 to 120 days after sowing",
    water: "Critical irrigation at knee-high, tasseling, silking, and grain filling.",
    fertilizer: "Apply NPK at sowing and split nitrogen at knee-high and tasseling.",
    pests: ["fall armyworm", "stem borer", "turcicum leaf blight"],
    stress: "Water stress at silking sharply reduces cob filling.",
    economics: "Works for grain, fodder, and silage; timely harvest protects quality.",
    stages: ["Emergence", "Knee-high", "Tasseling", "Silking", "Grain filling", "Harvest"],
    keywords: ["maize", "corn", "makka", "armyworm"]
  },
  {
    crop: "Mustard",
    season: "Rabi",
    sowing: "October to early November",
    harvest: "February to March",
    water: "Irrigate at flowering and pod filling if winter rain is insufficient.",
    fertilizer: "Sulfur is important; use balanced NPK and organic matter.",
    pests: ["aphid", "alternaria blight", "white rust"],
    stress: "Fog and high humidity increase blight; frost can damage flowers.",
    economics: "Oilseed cash crop; clean seed and low moisture improve value.",
    stages: ["Rosette", "Stem elongation", "Flowering", "Pod filling", "Maturity"],
    keywords: ["mustard", "sarson", "aphid", "oilseed"]
  },
  {
    crop: "Chilli",
    season: "Kharif, Rabi protected",
    sowing: "Nursery in May to June or September",
    transplanting: "30 to 40 days after nursery sowing",
    harvest: "Green chilli from 60 to 75 days after transplanting",
    water: "Use light frequent irrigation; avoid waterlogging.",
    fertilizer: "Compost, NPK, and calcium support fruit set and quality.",
    pests: ["thrips", "mites", "fruit rot", "leaf curl"],
    stress: "Dry heat increases mites; humidity increases fruit rot.",
    economics: "High-value but price volatile; grading and drying can reduce loss.",
    stages: ["Nursery", "Transplanting", "Branching", "Flowering", "Fruit set", "Picking"],
    keywords: ["chilli", "mirch", "thrips", "mites"]
  },
  {
    crop: "Onion",
    season: "Rabi",
    sowing: "Nursery in October to November",
    transplanting: "December to January",
    harvest: "April to May",
    water: "Irrigate regularly during bulb formation; stop before harvest for curing.",
    fertilizer: "Compost plus NPK; sulfur improves bulb quality.",
    pests: ["thrips", "purple blotch", "basal rot"],
    stress: "Excess moisture near maturity reduces storage quality.",
    economics: "Curing and storage drive returns; avoid bruising bulbs.",
    stages: ["Nursery", "Transplanting", "Vegetative growth", "Bulb initiation", "Bulb maturity", "Curing"],
    keywords: ["onion", "pyaz", "thrips", "bulb"]
  },
  {
    crop: "Potato",
    season: "Rabi",
    sowing: "October to November",
    harvest: "January to March",
    water: "Keep ridges moist during stolon and tuber formation.",
    fertilizer: "High potassium demand; apply compost and balanced NPK.",
    pests: ["late blight", "early blight", "aphid", "cutworm"],
    stress: "Cool humid weather favors late blight; heat reduces tuber bulking.",
    economics: "Seed quality, grading, and cold-chain timing influence returns.",
    stages: ["Sprouting", "Vegetative", "Stolon formation", "Tuber initiation", "Bulking", "Harvest"],
    keywords: ["potato", "aloo", "late blight", "tuber"]
  },
  {
    crop: "Cucurbits",
    season: "Zaid, Summer, Kharif",
    sowing: "February to March or June to July",
    harvest: "45 to 70 days after sowing depending on crop",
    water: "Frequent light irrigation; drip and mulch improve fruit quality.",
    fertilizer: "Compost and split NPK; add potassium during flowering.",
    pests: ["fruit fly", "powdery mildew", "downy mildew", "red pumpkin beetle"],
    stress: "Hot dry wind affects fruit set; humidity increases mildew.",
    economics: "Frequent picking and local market timing matter.",
    stages: ["Vine growth", "Flowering", "Fruit set", "Fruit development", "Picking"],
    keywords: ["cucurbit", "melon", "kharbuja", "pumpkin", "fruit fly"]
  },
  {
    crop: "Guava",
    season: "Perennial",
    sowing: "Planting in July to September or February to March",
    harvest: "Rainy and winter bahar depending on pruning",
    water: "Irrigate young plants regularly; avoid water stress during fruit development.",
    fertilizer: "Apply FYM and crop-age-based NPK; micronutrients improve fruit quality.",
    pests: ["fruit fly", "wilt", "anthracnose", "mealybug"],
    stress: "Waterlogging increases wilt; heat can cause fruit drop.",
    economics: "Pruning and bahar regulation help target better market windows.",
    stages: ["Planting", "Canopy growth", "Flowering", "Fruit set", "Fruit development", "Harvest"],
    keywords: ["guava", "amrud", "fruit fly", "orchard"]
  },
  {
    crop: "Okra",
    season: "Summer, Kharif",
    sowing: "February to March and June to July",
    harvest: "45 to 55 days after sowing, then frequent picking",
    water: "Irrigate every 4 to 7 days depending on heat and soil.",
    fertilizer: "Compost plus NPK; nitrogen split supports continuous picking.",
    pests: ["yellow vein mosaic", "jassid", "fruit borer", "aphid"],
    stress: "Heat and sucking pests increase virus risk.",
    economics: "Frequent picking keeps pods tender and improves price.",
    stages: ["Germination", "Vegetative", "Flowering", "Pod formation", "Picking"],
    keywords: ["okra", "bhindi", "yellow vein", "jassid"]
  },
  {
    crop: "Cauliflower",
    season: "Rabi",
    sowing: "Nursery from July to October by variety group",
    transplanting: "25 to 35 days after nursery sowing",
    harvest: "60 to 100 days after transplanting",
    water: "Maintain even moisture during curd formation.",
    fertilizer: "Compost, NPK, boron, and molybdenum support curd quality.",
    pests: ["diamondback moth", "aphid", "black rot", "downy mildew"],
    stress: "Temperature mismatch causes loose or ricey curds.",
    economics: "Variety timing and curd grading influence returns.",
    stages: ["Nursery", "Transplanting", "Vegetative", "Curd initiation", "Curd development", "Harvest"],
    keywords: ["cauliflower", "gobhi", "curd", "diamondback"]
  },
  {
    crop: "Cabbage",
    season: "Rabi",
    sowing: "Nursery from August to October",
    transplanting: "25 to 35 days after nursery sowing",
    harvest: "75 to 110 days after transplanting",
    water: "Even moisture supports firm head formation.",
    fertilizer: "Compost and split nitrogen; boron prevents hollow stem issues.",
    pests: ["diamondback moth", "aphid", "black rot"],
    stress: "Water stress reduces head size; warm weather loosens heads.",
    economics: "Head size uniformity and transport timing affect price.",
    stages: ["Nursery", "Transplanting", "Leaf growth", "Head initiation", "Head filling", "Harvest"],
    keywords: ["cabbage", "patta gobhi", "head", "black rot"]
  },
  {
    crop: "Capsicum",
    season: "Protected, Rabi",
    sowing: "Nursery in August to September or protected schedules",
    transplanting: "30 to 40 days after sowing",
    harvest: "60 to 80 days after transplanting",
    water: "Drip irrigation with steady moisture is preferred.",
    fertilizer: "Use compost, calcium, potassium, and micronutrients during fruiting.",
    pests: ["thrips", "mites", "fruit rot", "bacterial wilt"],
    stress: "High heat causes flower drop; humidity favors rot.",
    economics: "Protected cultivation can improve grade and price consistency.",
    stages: ["Nursery", "Transplanting", "Vegetative", "Flowering", "Fruit set", "Harvest"],
    keywords: ["capsicum", "shimla mirch", "bell pepper", "thrips"]
  },
  {
    crop: "Bottle gourd",
    season: "Summer, Kharif",
    sowing: "February to March or June to July",
    harvest: "55 to 70 days after sowing",
    water: "Frequent irrigation during flowering and fruit growth.",
    fertilizer: "Compost and split NPK; potassium supports fruit development.",
    pests: ["fruit fly", "powdery mildew", "red pumpkin beetle"],
    stress: "Poor pollination and heat stress can deform fruits.",
    economics: "Tender fruits and regular harvest improve market acceptance.",
    stages: ["Vine growth", "Flowering", "Fruit set", "Fruit elongation", "Picking"],
    keywords: ["bottle gourd", "lauki", "ghiya", "fruit fly"]
  },
  {
    crop: "Bitter gourd",
    season: "Summer, Kharif",
    sowing: "February to March or June to July",
    harvest: "55 to 65 days after sowing",
    water: "Keep soil consistently moist; mulch reduces heat stress.",
    fertilizer: "Compost and NPK; potassium during fruiting.",
    pests: ["fruit fly", "downy mildew", "aphid", "mites"],
    stress: "Humidity increases mildew; dry weather increases mites.",
    economics: "Regular picking and sorting by size support better prices.",
    stages: ["Vine growth", "Flowering", "Fruit set", "Fruit growth", "Picking"],
    keywords: ["bitter gourd", "karela", "fruit fly", "vine"]
  }
];

export const knowledgeCards = [
  {
    title: "Fertilizer safety",
    body: "Apply fertilizer in split doses, keep it away from seed contact, and irrigate after urea where possible to reduce volatilization."
  },
  {
    title: "Integrated pest management",
    body: "Scout weekly, preserve beneficial insects, use pheromone traps for borers, and spray only when pest counts cross local thresholds."
  },
  {
    title: "Biochar field note",
    body: "Blend mature biochar with compost before field use. Direct high-rate raw biochar can temporarily lock nutrients in light soils."
  },
  {
    title: "Offline advice",
    body: "When offline, FarmAssist answers from its built-in India crop database and stores field notes until the connection returns."
  }
];

export const diseaseRules = [
  {
    name: "Leaf spot or blight risk",
    cues: ["brown", "black", "spot", "yellow edge", "dry patch", "lesion"],
    advice: "Remove badly infected leaves, improve spacing, avoid overhead irrigation, and use a locally recommended copper or biofungicide spray if the issue spreads."
  },
  {
    name: "Nutrient deficiency signal",
    cues: ["yellow", "pale", "vein", "stunted", "purple"],
    advice: "Check soil moisture first, then apply compost tea or balanced micronutrient support. Confirm with a soil test before high fertilizer doses."
  },
  {
    name: "Sucking pest pressure",
    cues: ["curl", "sticky", "white", "tiny insect", "honeydew"],
    advice: "Inspect leaf undersides. Use yellow sticky traps, neem-based spray in the evening, and remove heavily infested leaves."
  }
];

export const seasonalFallback = {
  summer: { temp: 34, rain: 18, note: "Hot pre-monsoon conditions. Prioritize mulching and morning irrigation." },
  monsoon: { temp: 29, rain: 145, note: "High humidity and rainfall. Watch fungal disease and drainage." },
  winter: { temp: 21, rain: 12, note: "Cool rabi conditions. Irrigate at critical growth stages." }
};

export const marketPrices = [
  { commodity: "Paddy", mandi: "Raipur", price: 2240, unit: "quintal", trend: "steady" },
  { commodity: "Wheat", mandi: "Indore", price: 2475, unit: "quintal", trend: "up" },
  { commodity: "Cotton", mandi: "Nagpur", price: 7120, unit: "quintal", trend: "up" },
  { commodity: "Tomato", mandi: "Nashik", price: 1680, unit: "quintal", trend: "volatile" },
  { commodity: "Chickpea", mandi: "Bhopal", price: 5850, unit: "quintal", trend: "steady" }
];

export const soilProfiles = [
  {
    type: "Black cotton soil",
    crops: "Cotton, soybean, sorghum, chickpea",
    recommendations: "Prevent waterlogging, add compost for structure, and monitor zinc and sulfur."
  },
  {
    type: "Alluvial soil",
    crops: "Rice, wheat, sugarcane, vegetables",
    recommendations: "Use green manure, split nitrogen, and test potassium after intensive cropping."
  },
  {
    type: "Red sandy soil",
    crops: "Millets, groundnut, pulses, cashew",
    recommendations: "Increase organic matter, use drip irrigation, and apply lime if pH is low."
  }
];

export const bioSpecies = [
  { label: "Bird chorus", band: "2 to 8 kHz", value: 31 },
  { label: "Pollinator wing activity", band: "180 to 300 Hz", value: 18 },
  { label: "Frog or wetland calls", band: "400 to 1200 Hz", value: 14 },
  { label: "Insect stridulation", band: "5 to 12 kHz", value: 22 }
];
