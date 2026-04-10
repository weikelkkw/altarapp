'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BOOKS } from '../types';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Props {
  accentColor: string;
  onNavigateToRead: (book: { name: string; osis: string; chapters: number }, chapter: number) => void;
}

interface MapLocation {
  name: string;
  lat: number;
  lng: number;
  description: string;
  significance: string;
  era?: string;
  color?: string;
  tier?: 'primary' | 'secondary' | 'standard';
}

interface BibleMap {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  accentHex: string;
  center: [number, number];
  zoom: number;
  locations: MapLocation[];
  relatedPassages: { ref: string; bookName: string; chapter: number }[];
  isJourney?: boolean;
}

// ── Era Colors ────────────────────────────────────────────────────────────────

const ERA_COLORS: Record<string, string> = {
  Patriarchs: '#f59e0b',
  Exodus: '#f97316',
  Conquest: '#84cc16',
  'Old Testament': '#06b6d4',
  'All Eras': '#8b5cf6',
  'New Testament': '#22c55e',
  'Patriarchs / NT': '#10b981',
  'Old Testament / NT': '#6366f1',
  '~95 AD': '#a855f7',
  Creation: '#10b981',
  Flood: '#06b6d4',
  'Post-Flood': '#f59e0b',
  Israel: '#3b82f6',
  'United / Judah': '#f59e0b',
  Judah: '#8b5cf6',
  'Kingdom Era': '#ef4444',
  '~47–57 AD': '#a855f7',
  '~47 AD': '#a855f7',
  '~47–48 AD': '#a855f7',
  '~50 AD': '#a855f7',
  '~50–52 AD': '#a855f7',
  '~52–55 AD': '#a855f7',
  '~59 AD': '#a855f7',
  '~60–62 AD': '#a855f7',
  '~4 BC': '#22c55e',
  '~3 BC': '#22c55e',
  '~4 BC–27 AD': '#22c55e',
  '~27 AD': '#22c55e',
  '~27–30 AD': '#22c55e',
  '~28 AD': '#22c55e',
  '~29 AD': '#22c55e',
  '~30 AD': '#22c55e',
};

// ── Map Data ──────────────────────────────────────────────────────────────────

const MAPS: BibleMap[] = [
  {
    id: 'holy-land',
    title: 'The Holy Land',
    description: 'Key locations in ancient Israel — the land God promised to Abraham and his descendants.',
    category: 'Geography',
    icon: '🗺',
    accentHex: '#f59e0b',
    center: [35.22, 31.77],
    zoom: 7,
    isJourney: false,
    locations: [
      { name: 'Jerusalem', lat: 31.7683, lng: 35.2137, era: 'All Eras', description: 'The holy city. Temple mount, crucifixion, resurrection. Capital of Israel under David and Solomon.', significance: 'Center of biblical history', color: '#fbbf24', tier: 'primary' },
      { name: 'Bethlehem', lat: 31.7054, lng: 35.2024, era: 'Patriarchs / NT', description: 'Birthplace of Jesus and King David. 6 miles south of Jerusalem.', significance: 'Fulfillment of Micah 5:2', tier: 'primary' },
      { name: 'Nazareth', lat: 32.6996, lng: 35.3035, era: 'New Testament', description: 'Where Jesus grew up. A small, insignificant village in Galilee.', significance: '"Can anything good come from Nazareth?"', tier: 'primary' },
      { name: 'Capernaum', lat: 32.8807, lng: 35.5750, era: 'New Testament', description: "Jesus' base of ministry on the Sea of Galilee. Home of Peter, Andrew, Matthew.", significance: 'More miracles here than anywhere', color: '#22c55e' },
      { name: 'Sea of Galilee', lat: 32.8208, lng: 35.5858, era: 'New Testament', description: 'Freshwater lake where Jesus called fishermen, walked on water, calmed storms.', significance: "Center of Jesus' Galilean ministry" },
      { name: 'Jordan River', lat: 31.8333, lng: 35.5500, era: 'All Eras', description: 'Where Jesus was baptized by John. Israel crossed it to enter the Promised Land.', significance: 'Baptism and new beginnings', color: '#3b82f6' },
      { name: 'Dead Sea', lat: 31.5200, lng: 35.4733, era: 'All Eras', description: 'Lowest point on earth. Near Sodom and Gomorrah. Dead Sea Scrolls found here.', significance: 'Judgment and preservation' },
      { name: 'Jericho', lat: 31.8552, lng: 35.4444, era: 'Old Testament', description: "First city conquered in the Promised Land. Walls fell at Joshua's shout.", significance: 'God fights for His people' },
      { name: 'Hebron', lat: 31.5326, lng: 35.0998, era: 'Patriarchs', description: 'Where Abraham settled. Burial place of Abraham, Isaac, Jacob, and their wives.', significance: 'Patriarchal roots' },
      { name: 'Samaria', lat: 32.2786, lng: 35.1964, era: 'Old Testament / NT', description: "Capital of the northern kingdom. Jesus spoke with the Samaritan woman at Jacob's well.", significance: 'Gospel for all people' },
      { name: 'Mount Sinai', lat: 28.5391, lng: 33.9752, era: 'Exodus', description: 'Where God gave Moses the Ten Commandments. Also called Mount Horeb.', significance: 'The Law given', color: '#fbbf24' },
      { name: 'Dan', lat: 33.2528, lng: 35.6511, era: 'Old Testament', description: '"From Dan to Beersheba" meant the entire nation. Northernmost point.', significance: 'Northern boundary' },
      { name: 'Beersheba', lat: 31.2530, lng: 34.7915, era: 'Patriarchs', description: 'Southernmost point of Israel. Where Abraham made a covenant and Hagar wandered.', significance: 'Southern boundary' },
    ],
    relatedPassages: [
      { ref: 'Genesis 12', bookName: 'Genesis', chapter: 12 },
      { ref: 'Joshua 1', bookName: 'Joshua', chapter: 1 },
      { ref: 'Matthew 2', bookName: 'Matthew', chapter: 2 },
    ],
  },
  {
    id: 'exodus-route',
    title: 'The Exodus',
    description: 'The journey of Israel from slavery in Egypt to the Promised Land — 40 years in the wilderness.',
    category: 'Journey',
    icon: '🏜',
    accentHex: '#f97316',
    center: [33.5, 29.8],
    zoom: 5.5,
    isJourney: true,
    locations: [
      { name: 'Goshen (Egypt)', lat: 30.6, lng: 31.5, era: 'Exodus', description: 'Where the Israelites lived as slaves for 400 years. The ten plagues struck here.', significance: 'God heard their cry', color: '#ef4444', tier: 'primary' },
      { name: 'Red Sea Crossing', lat: 29.5, lng: 32.5, era: 'Exodus', description: "God parted the waters. Israel walked through on dry ground. Pharaoh's army destroyed.", significance: "Deliverance by God's power", color: '#3b82f6', tier: 'primary' },
      { name: 'Marah', lat: 29.1, lng: 33.0, era: 'Exodus', description: 'Bitter waters made sweet by a piece of wood. First test in the wilderness.', significance: 'God provides even in bitterness' },
      { name: 'Mount Sinai', lat: 28.5391, lng: 33.9752, era: 'Exodus', description: 'Camped here for a year. Received the Law, built the Tabernacle, golden calf incident.', significance: 'Covenant established', color: '#fbbf24', tier: 'primary' },
      { name: 'Kadesh Barnea', lat: 30.6, lng: 34.4, era: 'Exodus', description: 'Where the 12 spies were sent. Israel refused to enter. Condemned to 40 years wandering.', significance: 'Cost of unbelief', color: '#ef4444' },
      { name: 'Mount Nebo', lat: 31.7667, lng: 35.7167, era: 'Exodus', description: 'Where Moses saw the Promised Land but could not enter. He died here at 120 years old.', significance: 'Faithful to the end' },
      { name: 'Jordan Crossing', lat: 31.83, lng: 35.55, era: 'Conquest', description: "Under Joshua's leadership, Israel crossed the Jordan on dry ground into the Promised Land.", significance: 'Promise fulfilled', color: '#22c55e' },
      { name: 'Jericho', lat: 31.8552, lng: 35.4444, era: 'Conquest', description: "First conquest in the Promised Land. Walls fell at God's command.", significance: 'God fights the battle', color: '#22c55e' },
    ],
    relatedPassages: [
      { ref: 'Exodus 12', bookName: 'Exodus', chapter: 12 },
      { ref: 'Exodus 14', bookName: 'Exodus', chapter: 14 },
      { ref: 'Numbers 13', bookName: 'Numbers', chapter: 13 },
      { ref: 'Joshua 3', bookName: 'Joshua', chapter: 3 },
    ],
  },
  {
    id: 'paul-journeys',
    title: "Paul's Missionary Journeys",
    description: 'Three major journeys that spread Christianity across the Roman Empire — plus the voyage to Rome.',
    category: 'Journey',
    icon: '⛵',
    accentHex: '#a855f7',
    center: [24.0, 38.5],
    zoom: 4.5,
    isJourney: true,
    locations: [
      { name: 'Antioch (Syria)', lat: 36.2, lng: 36.1617, era: '~47–57 AD', description: 'Believers first called "Christians" here. Launching point for all three journeys.', significance: 'Birthplace of missions', color: '#22c55e', tier: 'primary' },
      { name: 'Cyprus', lat: 35.0, lng: 33.0, era: '~47 AD', description: "First stop on the first journey. Barnabas' homeland. Confronted a sorcerer here.", significance: 'First missionary journey begins' },
      { name: 'Galatia', lat: 39.0, lng: 32.5, era: '~47–48 AD', description: 'Paul planted churches here. Later wrote the letter to the Galatians about freedom in Christ.', significance: 'Justification by faith' },
      { name: 'Philippi', lat: 41.0130, lng: 24.2833, era: '~50 AD', description: 'First European church. Lydia converted. Paul and Silas sang in prison, jailer saved.', significance: 'Gospel reaches Europe', color: '#a855f7', tier: 'primary' },
      { name: 'Thessalonica', lat: 40.6401, lng: 22.9444, era: '~50 AD', description: "Paul preached in the synagogue. Wrote 1 & 2 Thessalonians about Christ's return.", significance: 'Living in hope' },
      { name: 'Athens', lat: 37.9838, lng: 23.7275, era: '~50 AD', description: 'Paul\'s sermon on Mars Hill — "the unknown God." Intellectual center of the ancient world.', significance: 'Gospel meets philosophy' },
      { name: 'Corinth', lat: 37.9409, lng: 22.8677, era: '~50–52 AD', description: 'Paul stayed 18 months. Wrote 1 & 2 Corinthians. A morally corrupt city transformed by the Gospel.', significance: 'Grace in broken places' },
      { name: 'Ephesus', lat: 37.9417, lng: 27.3417, era: '~52–55 AD', description: "Paul's longest ministry (3 years). Burning of occult books. Temple of Artemis riot.", significance: 'Power over darkness', color: '#fbbf24', tier: 'primary' },
      { name: 'Malta', lat: 35.9375, lng: 14.3754, era: '~59 AD', description: 'Shipwrecked on the way to Rome. Paul bitten by a viper but unharmed. Healed the sick.', significance: "God's protection" },
      { name: 'Rome', lat: 41.9028, lng: 12.4964, era: '~60–62 AD', description: 'Paul arrived as a prisoner. Wrote Ephesians, Philippians, Colossians, Philemon from here.', significance: 'Gospel reaches the capital', color: '#ef4444', tier: 'primary' },
    ],
    relatedPassages: [
      { ref: 'Acts 13', bookName: 'Acts', chapter: 13 },
      { ref: 'Acts 16', bookName: 'Acts', chapter: 16 },
      { ref: 'Acts 17', bookName: 'Acts', chapter: 17 },
      { ref: 'Acts 27', bookName: 'Acts', chapter: 27 },
    ],
  },
  {
    id: 'jesus-ministry',
    title: 'Ministry of Jesus',
    description: 'Where Jesus lived, taught, performed miracles, died, and rose again.',
    category: 'Journey',
    icon: '✝',
    accentHex: '#22c55e',
    center: [35.3, 32.0],
    zoom: 7.5,
    isJourney: true,
    locations: [
      { name: 'Bethlehem', lat: 31.7054, lng: 35.2024, era: '~4 BC', description: 'Born in a manger. Visited by shepherds and wise men. Fulfilling Micah 5:2.', significance: 'God becomes human', color: '#fbbf24', tier: 'primary' },
      { name: 'Egypt', lat: 30.06, lng: 31.24, era: '~3 BC', description: 'Joseph, Mary, and Jesus fled here from Herod. Fulfilling Hosea 11:1.', significance: 'God protects the child' },
      { name: 'Nazareth', lat: 32.6996, lng: 35.3035, era: '~4 BC–27 AD', description: 'Grew up here. Rejected in His hometown synagogue.', significance: 'A prophet without honor', tier: 'primary' },
      { name: 'Cana', lat: 32.7564, lng: 35.3440, era: '~27 AD', description: 'First miracle: water turned to wine at a wedding.', significance: "Jesus' glory revealed" },
      { name: 'Capernaum', lat: 32.8807, lng: 35.5750, era: '~27–30 AD', description: "Home base of ministry. Healed Peter's mother-in-law, paralytic, centurion's servant.", significance: 'Miracles and teaching', color: '#22c55e', tier: 'primary' },
      { name: 'Sea of Galilee', lat: 32.8208, lng: 35.5858, era: '~27–30 AD', description: 'Walked on water, calmed the storm, fed 5,000 on its shores.', significance: 'Lord over nature' },
      { name: 'Caesarea Philippi', lat: 33.2487, lng: 35.6977, era: '~29 AD', description: 'Peter declared "You are the Christ." Jesus predicted His death and resurrection.', significance: 'The great turning point' },
      { name: 'Mount Tabor', lat: 32.6862, lng: 35.3906, era: '~29 AD', description: 'Jesus transfigured before Peter, James, John. Moses and Elijah appeared.', significance: 'Divine glory revealed' },
      { name: 'Samaria', lat: 32.2786, lng: 35.1964, era: '~28 AD', description: 'Woman at the well. "God is spirit, and His worshipers must worship in spirit and truth."', significance: 'Living water' },
      { name: 'Bethany', lat: 31.7726, lng: 35.2610, era: '~30 AD', description: 'Home of Mary, Martha, Lazarus. Jesus raised Lazarus from the dead.', significance: 'Power over death' },
      { name: 'Jerusalem', lat: 31.7683, lng: 35.2137, era: '~30 AD', description: 'Triumphal entry, Last Supper, trial, crucifixion at Golgotha, burial, resurrection.', significance: 'Salvation accomplished', color: '#ef4444', tier: 'primary' },
      { name: 'Garden of Gethsemane', lat: 31.7792, lng: 35.2396, era: '~30 AD', description: '"Not my will, but yours be done." Jesus arrested here after His prayer.', significance: 'Ultimate surrender' },
      { name: 'Golgotha', lat: 31.7784, lng: 35.2299, era: '~30 AD', description: 'The Place of the Skull. Where Jesus was crucified between two thieves.', significance: 'The cross — it is finished', color: '#ef4444' },
      { name: 'Empty Tomb', lat: 31.7785, lng: 35.2300, era: '~30 AD', description: 'He is not here — He is risen! The resurrection is the foundation of the Christian faith.', significance: 'Victory over death forever', color: '#fbbf24', tier: 'primary' },
    ],
    relatedPassages: [
      { ref: 'Luke 2', bookName: 'Luke', chapter: 2 },
      { ref: 'John 2', bookName: 'John', chapter: 2 },
      { ref: 'Matthew 14', bookName: 'Matthew', chapter: 14 },
      { ref: 'John 11', bookName: 'John', chapter: 11 },
      { ref: 'Matthew 27', bookName: 'Matthew', chapter: 27 },
      { ref: 'John 20', bookName: 'John', chapter: 20 },
    ],
  },
  {
    id: 'seven-churches',
    title: 'Seven Churches of Revelation',
    description: 'The seven churches Jesus addressed in Revelation 2–3 — each with a unique message for today.',
    category: 'Prophecy',
    icon: '🏛',
    accentHex: '#a855f7',
    center: [27.8, 38.5],
    zoom: 7,
    isJourney: false,
    locations: [
      { name: 'Ephesus', lat: 37.9417, lng: 27.3417, era: '~95 AD', description: 'Lost their first love. "Remember the height from which you have fallen. Repent and do the things you did at first."', significance: 'Return to your first love', color: '#ef4444', tier: 'primary' },
      { name: 'Smyrna', lat: 38.4237, lng: 27.1428, era: '~95 AD', description: 'Suffering church. "Be faithful even to death, and I will give you the crown of life."', significance: 'Faithful in persecution', color: '#a855f7', tier: 'primary' },
      { name: 'Pergamum', lat: 39.1208, lng: 27.1833, era: '~95 AD', description: '"Where Satan has his throne." Compromising with false teaching. "I will fight against them with the sword of my mouth."', significance: 'Hold to truth', color: '#fb923c', tier: 'primary' },
      { name: 'Thyatira', lat: 38.9167, lng: 27.8333, era: '~95 AD', description: 'Tolerating false prophecy and immorality. "Hold on to what you have until I come."', significance: 'Discernment matters' },
      { name: 'Sardis', lat: 38.4886, lng: 28.0333, era: '~95 AD', description: '"You have a reputation of being alive, but you are dead." Wake up and strengthen what remains.', significance: 'Authenticity over reputation', color: '#64748b' },
      { name: 'Philadelphia', lat: 38.3500, lng: 28.5167, era: '~95 AD', description: '"I have placed before you an open door that no one can shut." Faithful with little strength.', significance: 'God opens doors no one can close', color: '#22c55e' },
      { name: 'Laodicea', lat: 37.8333, lng: 29.1167, era: '~95 AD', description: '"You are neither hot nor cold." Lukewarm and self-sufficient. "I stand at the door and knock."', significance: 'Wholehearted devotion', color: '#fbbf24' },
    ],
    relatedPassages: [
      { ref: 'Revelation 2', bookName: 'Revelation', chapter: 2 },
      { ref: 'Revelation 3', bookName: 'Revelation', chapter: 3 },
    ],
  },
  {
    id: 'genesis-world',
    title: 'Garden of Eden & The Flood',
    description: 'The world of origins — paradise, judgment, and the scattering of nations across the earth.',
    category: 'Origins',
    icon: '🌿',
    accentHex: '#10b981',
    center: [43.0, 32.0],
    zoom: 4.5,
    isJourney: false,
    locations: [
      { name: 'Garden of Eden (approx)', lat: 33.0, lng: 44.0, era: 'Creation', description: 'Where God placed Adam and Eve. Four rivers flowed from it — the Pishon, Gihon, Tigris, and Euphrates.', significance: 'Paradise — the beginning of everything', color: '#10b981', tier: 'primary' },
      { name: 'Mount Ararat', lat: 39.7, lng: 44.3, era: 'Flood', description: "Noah's ark rested here after the floodwaters receded. God made his covenant with Noah.", significance: 'Judgment and mercy', color: '#06b6d4', tier: 'primary' },
      { name: 'Tower of Babel (Babylon)', lat: 32.54, lng: 44.42, era: 'Post-Flood', description: 'Mankind built a tower to reach heaven. God confused their language and scattered them across the earth.', significance: 'Pride before the fall', color: '#f59e0b', tier: 'primary' },
      { name: 'Ur of the Chaldeans', lat: 30.96, lng: 46.1, era: 'Patriarchs', description: "Abraham's hometown. God called him to leave everything for an unknown land.", significance: 'The call that changed history' },
      { name: 'Haran', lat: 36.87, lng: 39.02, era: 'Patriarchs', description: 'Abraham stopped here on his journey. His father Terah died here. God renewed the call.', significance: 'Halfway is not enough' },
      { name: 'Nineveh', lat: 36.34, lng: 43.14, era: 'Post-Flood', description: 'Assyrian capital. Jonah preached here. The entire city repented — the greatest revival in history.', significance: "God's mercy reaches enemies" },
    ],
    relatedPassages: [
      { ref: 'Genesis 1', bookName: 'Genesis', chapter: 1 },
      { ref: 'Genesis 6', bookName: 'Genesis', chapter: 6 },
      { ref: 'Genesis 11', bookName: 'Genesis', chapter: 11 },
      { ref: 'Genesis 12', bookName: 'Genesis', chapter: 12 },
      { ref: 'Jonah 3', bookName: 'Jonah', chapter: 3 },
    ],
  },
  {
    id: 'kingdoms',
    title: 'Kingdoms of Israel & Judah',
    description: 'The divided kingdom — north and south, glory and ruin, prophets and kings.',
    category: 'Kingdom Era',
    icon: '👑',
    accentHex: '#3b82f6',
    center: [35.5, 32.2],
    zoom: 7,
    isJourney: false,
    locations: [
      { name: 'Jerusalem (capital of Judah)', lat: 31.7683, lng: 35.2137, era: 'United / Judah', description: "David's capital. Solomon's temple built here. Capital of Judah after the split.", significance: 'City of the Great King', color: '#f59e0b', tier: 'primary' },
      { name: 'Samaria (capital of Israel)', lat: 32.278, lng: 35.196, era: 'Israel', description: 'Capital of the northern kingdom after the split. Ten tribes. Eventually destroyed by Assyria.', significance: 'Where the north went astray', color: '#3b82f6', tier: 'primary' },
      { name: 'Bethel', lat: 31.927, lng: 35.226, era: 'Israel', description: 'Jeroboam set up golden calves here. Jacob wrestled with God at this spot.', significance: 'Where false worship began', color: '#ef4444' },
      { name: 'Dan', lat: 33.25, lng: 35.65, era: 'Israel', description: 'Northernmost point. Second golden calf set up here by Jeroboam.', significance: 'Northern idolatry' },
      { name: 'Jezreel', lat: 32.456, lng: 35.29, era: 'Israel', description: "Ahab and Jezebel's palace. Naboth's vineyard. Where Jezebel died.", significance: 'The cost of injustice' },
      { name: 'Megiddo', lat: 32.584, lng: 35.185, era: 'Kingdom Era', description: 'Strategic military fortress. Many battles fought here. Armageddon is named after this valley.', significance: 'Where history turns' },
      { name: 'Carmel', lat: 32.735, lng: 35.057, era: 'Israel', description: "Elijah's contest with 450 prophets of Baal. Fire fell from heaven. All Israel saw it.", significance: 'There is only one God', color: '#f97316', tier: 'primary' },
      { name: 'Lachish', lat: 31.56, lng: 34.85, era: 'Judah', description: 'Major fortified city. Assyrian army besieged it. Famous Lachish Letters found here.', significance: 'Under the shadow of empire' },
    ],
    relatedPassages: [
      { ref: '1 Kings 12', bookName: '1 Kings', chapter: 12 },
      { ref: '1 Kings 18', bookName: '1 Kings', chapter: 18 },
      { ref: '2 Kings 17', bookName: '2 Kings', chapter: 17 },
      { ref: '2 Chronicles 36', bookName: '2 Chronicles', chapter: 36 },
    ],
  },
];

// ── Category gradient helper ──────────────────────────────────────────────────

function categoryGradient(category: string, accentHex: string): string {
  if (category === 'Geography') return 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(245,158,11,0.05))';
  if (category === 'Journey') return 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(59,130,246,0.05))';
  return `linear-gradient(135deg, ${accentHex}18, ${accentHex}06)`;
}

// ── MapboxView ────────────────────────────────────────────────────────────────

function MapboxView({
  map,
  onLocationTap,
  selectedLocation,
}: {
  map: BibleMap;
  onLocationTap: (loc: MapLocation) => void;
  selectedLocation: MapLocation | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ marker: any; el: HTMLElement; loc: MapLocation }[]>([]);
  const animFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const travelerRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const travelerMarkerRef = useRef<any>(null);

  const accentHex = map.accentHex;

  // Build marker HTML for a location
  function buildMarkerEl(loc: MapLocation, isPrimary: boolean): HTMLElement {
    const wrapper = document.createElement('div');
    const dotSize = isPrimary ? 22 : 14;
    const ringSize = isPrimary ? 52 : 36;
    const delay = (Math.random() * 2).toFixed(2);
    const color = loc.color || accentHex;
    const labelSize = isPrimary ? 11 : 9;

    wrapper.style.cssText = `position:relative; width:${ringSize}px; height:${ringSize + 28}px; cursor:pointer;`;

    const outerRing = document.createElement('div');
    outerRing.style.cssText = `position:absolute;top:0;left:0;width:${ringSize}px;height:${ringSize}px;border-radius:50%;background:${color};animation:bibRingPulse 2.5s ease-out infinite;animation-delay:${delay}s;opacity:0.55;`;

    const innerRing = document.createElement('div');
    const ir = Math.round(ringSize * 0.18);
    const is = Math.round(ringSize * 0.64);
    innerRing.style.cssText = `position:absolute;top:${ir}px;left:${ir}px;width:${is}px;height:${is}px;border-radius:50%;border:1.5px solid ${color}88;animation:bibRingPulse 2.5s ease-out infinite;animation-delay:${(parseFloat(delay)+0.8).toFixed(2)}s;opacity:0.4;`;

    const dot = document.createElement('div');
    dot.className = 'bib-dot';
    dot.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) translateY(-14px);width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,0.5) 10%,${color} 60%);border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 0 3px ${color}44,0 0 16px ${color},0 0 32px ${color}99,0 0 56px ${color}44,0 3px 10px rgba(0,0,0,0.9);transition:transform 0.18s ease,box-shadow 0.18s ease;pointer-events:none;`;

    const label = document.createElement('div');
    label.style.cssText = `position:absolute;bottom:0;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(8,6,4,0.82);border:1px solid ${color}55;border-radius:20px;padding:2px 8px;font-size:${labelSize}px;font-weight:900;font-family:Montserrat,sans-serif;color:#f8f0dc;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 0 10px ${color}44,0 2px 6px rgba(0,0,0,0.8);pointer-events:none;`;
    label.textContent = loc.name;

    wrapper.appendChild(outerRing);
    wrapper.appendChild(innerRing);
    wrapper.appendChild(dot);
    wrapper.appendChild(label);

    wrapper.addEventListener('mouseenter', () => {
      const dot = wrapper.querySelector('.bib-dot') as HTMLElement | null;
      if (dot) {
        dot.style.transform = 'translate(-50%,-50%) translateY(-14px) scale(1.4)';
        dot.style.boxShadow = `0 0 0 4px ${color}55, 0 0 24px ${color}, 0 0 48px ${color}bb, 0 0 80px ${color}55, 0 3px 10px rgba(0,0,0,0.9)`;
      }
    });
    wrapper.addEventListener('mouseleave', () => {
      const dot = wrapper.querySelector('.bib-dot') as HTMLElement | null;
      if (dot) {
        dot.style.transform = 'translate(-50%,-50%) translateY(-14px) scale(1)';
        dot.style.boxShadow = `0 0 0 3px ${color}44, 0 0 16px ${color}, 0 0 32px ${color}99, 0 0 56px ${color}44, 0 3px 10px rgba(0,0,0,0.9)`;
      }
    });

    return wrapper;
  }

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

      const mbMap = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: map.center,
        zoom: map.zoom,
        attributionControl: false,
      });

      mbMap.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
      mbMap.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      mbMap.on('load', () => {
        if (cancelled) return;

        // Inject keyframe animation into the map container
        const styleTag = document.createElement('style');
        styleTag.textContent = `
          @keyframes bibRingPulse {
            0% { transform: scale(0.6); opacity: 0.7; }
            100% { transform: scale(2.8); opacity: 0; }
          }
          .bible-map-popup .mapboxgl-popup-content {
            background: rgba(14,12,8,0.97);
            border: 1px solid ${accentHex}55;
            border-radius: 10px;
            padding: 10px 13px;
            box-shadow: 0 6px 28px rgba(0,0,0,0.85), 0 0 18px ${accentHex}28;
            min-width: 200px;
            max-width: 250px;
          }
          .bible-map-popup .mapboxgl-popup-close-button {
            color: rgba(240,248,244,0.45);
            font-size: 15px;
            padding: 0 6px;
            line-height: 1;
            top: 5px;
            right: 4px;
          }
          .bible-map-popup .mapboxgl-popup-close-button:hover {
            color: rgba(240,248,244,0.85);
            background: transparent;
          }
          .mapboxgl-popup-tip { display: none; }
        `;
        containerRef.current?.appendChild(styleTag);

        // Hide all text/symbol layers — our custom markers handle all labeling
        mbMap.getStyle().layers?.forEach((layer: any) => {
          if (layer.type === 'symbol' || layer.type === 'line') {
            try { mbMap.setLayoutProperty(layer.id, 'visibility', 'none'); } catch {}
          }
        });

        // Add location markers
        map.locations.forEach((loc, idx) => {
          const isPrimary = loc.tier === 'primary' || idx < 3;
          const el = buildMarkerEl(loc, isPrimary);
          const locColor = loc.color || accentHex;
          const eraColor = ERA_COLORS[loc.era || ''] || accentHex;
          const descPreview = loc.description.length > 110 ? loc.description.slice(0, 110) + '…' : loc.description;

          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            offset: isPrimary ? 34 : 26,
            className: 'bible-map-popup',
            maxWidth: '280px',
          }).setHTML(`
            <div style="font-family:Montserrat,sans-serif;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="width:10px;height:10px;border-radius:50%;background:${locColor};box-shadow:0 0 10px ${locColor},0 0 20px ${locColor}66;flex-shrink:0;"></div>
                <span style="font-size:14px;font-weight:900;color:#f8f0dc;letter-spacing:0.04em;text-transform:uppercase;">${loc.name}</span>
              </div>
              ${loc.era ? `<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:${eraColor};background:${eraColor}22;border:1px solid ${eraColor}44;padding:3px 9px;border-radius:20px;display:inline-block;margin-bottom:9px;">${loc.era}</div>` : ''}
              <p style="font-size:11px;font-weight:700;font-style:italic;color:#fcd97a;margin:0 0 7px 0;line-height:1.5;font-family:Georgia,serif;">"${loc.significance}"</p>
              <p style="font-size:11px;color:rgba(235,225,200,0.78);margin:0;line-height:1.6;font-family:Georgia,serif;">${descPreview}</p>
            </div>
          `);

          el.addEventListener('click', () => {
            // Close any other open popups
            markersRef.current.forEach(({ marker: m }) => {
              if (m.getPopup()?.isOpen()) m.togglePopup();
            });
            mbMap.flyTo({ center: [loc.lng, loc.lat], zoom: Math.max(mbMap.getZoom(), 9), duration: 1400, curve: 1.8, speed: 1.4, easing: (t: number) => t * (2 - t) });
            const mkr = markersRef.current.find(m => m.loc.name === loc.name);
            if (mkr && !mkr.marker.getPopup()?.isOpen()) mkr.marker.togglePopup();
            onLocationTap(loc);
          });

          const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([loc.lng, loc.lat])
            .setPopup(popup)
            .addTo(mbMap);

          markersRef.current.push({ marker, el, loc });
        });

        // Journey path animation for isJourney maps
        if (map.isJourney && map.locations.length >= 2) {
          const coords: [number, number][] = map.locations.map(l => [l.lng, l.lat]);

          // Add sources and layers
          mbMap.addSource('journey-path', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
          });

          // Glow layer
          mbMap.addLayer({
            id: 'journey-glow',
            type: 'line',
            source: 'journey-path',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': accentHex,
              'line-width': 10,
              'line-opacity': 0.15,
              'line-blur': 5,
            },
          });

          // Main dashed layer
          mbMap.addLayer({
            id: 'journey-line',
            type: 'line',
            source: 'journey-path',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': accentHex,
              'line-width': 3,
              'line-opacity': 0.85,
              'line-dasharray': [5, 4],
            },
          });

          // Animate path drawing
          const totalFrames = 120;
          let frame = 0;

          const drawPath = () => {
            if (cancelled) return;
            frame++;
            const progress = Math.min(frame / totalFrames, 1);
            const numCoords = Math.max(2, Math.round(progress * coords.length));
            const partial = coords.slice(0, numCoords);

            const src = mbMap.getSource('journey-path') as any;
            if (src) {
              src.setData({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: partial },
                properties: {},
              });
            }

            if (progress < 1) {
              animFrameRef.current = requestAnimationFrame(drawPath);
            } else {
              // Path fully drawn — start traveler
              startTraveler(coords, mbMap, mapboxgl);
            }
          };

          setTimeout(() => {
            if (!cancelled) animFrameRef.current = requestAnimationFrame(drawPath);
          }, 500);
        }
      });

      mapRef.current = mbMap;
    });

    return () => {
      cancelled = true;
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      if (travelerRef.current !== null) cancelAnimationFrame(travelerRef.current);
      travelerMarkerRef.current?.remove();
      travelerMarkerRef.current = null;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [map.id]);

  function startTraveler(coords: [number, number][], mbMap: any, mapboxgl: any) {
    let t = 0;

    const travelerEl = document.createElement('div');
    travelerEl.style.cssText = `
      width: 12px; height: 12px; border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 0 12px ${accentHex}, 0 0 24px ${accentHex}88, 0 0 4px rgba(255,255,255,0.9);
      pointer-events: none;
    `;

    const tMarker = new mapboxgl.Marker({ element: travelerEl, anchor: 'center' })
      .setLngLat(coords[0])
      .addTo(mbMap);
    travelerMarkerRef.current = tMarker;

    const moveTraveler = () => {
      t = (t + 0.003) % 1;
      const scaledT = t * (coords.length - 1);
      const idx = Math.floor(scaledT);
      const frac = scaledT - idx;
      const a = coords[Math.min(idx, coords.length - 1)];
      const b = coords[Math.min(idx + 1, coords.length - 1)];
      const lng = a[0] + (b[0] - a[0]) * frac;
      const lat = a[1] + (b[1] - a[1]) * frac;
      tMarker.setLngLat([lng, lat]);
      travelerRef.current = requestAnimationFrame(moveTraveler);
    };

    travelerRef.current = requestAnimationFrame(moveTraveler);
  }

  // Fly to selected location
  useEffect(() => {
    if (!selectedLocation || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedLocation.lng, selectedLocation.lat],
      zoom: Math.max(mapRef.current.getZoom(), 9),
      duration: 800,
    });
    // Scale selected marker — big glowing dot on the selected location
    markersRef.current.forEach(({ el, loc }) => {
      const dot = el.querySelector('.bib-dot') as HTMLElement | null;
      const isSelected = loc.name === selectedLocation.name;
      el.style.transform = isSelected ? 'scale(1.6)' : 'scale(1)';
      el.style.zIndex = isSelected ? '999' : '';
      if (dot) {
        const c = loc.color || accentHex;
        if (isSelected) {
          dot.style.width = '28px';
          dot.style.height = '28px';
          dot.style.transform = 'translate(-50%,-50%) translateY(-14px) scale(1)';
          dot.style.boxShadow = `0 0 0 6px ${c}66, 0 0 30px ${c}, 0 0 60px ${c}cc, 0 0 100px ${c}66, 0 4px 14px rgba(0,0,0,0.95)`;
          dot.style.border = '3px solid #fff';
        } else {
          dot.style.width = '';
          dot.style.height = '';
          dot.style.transform = 'translate(-50%,-50%) translateY(-14px) scale(1)';
          dot.style.boxShadow = `0 0 0 3px ${c}44, 0 0 16px ${c}, 0 0 32px ${c}99, 0 0 56px ${c}44, 0 3px 10px rgba(0,0,0,0.9)`;
          dot.style.border = '2px solid rgba(255,255,255,0.9)';
        }
      }
    });
  }, [selectedLocation]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ height: 420, border: `1px solid ${accentHex}30`, boxShadow: `0 0 40px ${accentHex}18` }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// ── Location Detail Panel ─────────────────────────────────────────────────────

function LocationDetail({
  loc,
  accentHex,
  onClose,
}: {
  loc: MapLocation;
  accentHex: string;
  onClose: () => void;
}) {
  const locColor = loc.color || accentHex;
  const eraColor = ERA_COLORS[loc.era || ''] || accentHex;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${locColor}14, ${locColor}06)`,
        border: `1px solid ${locColor}30`,
        boxShadow: `0 4px 24px ${locColor}18`,
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${locColor}1a` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
              style={{
                background: locColor,
                boxShadow: `0 0 10px ${locColor}88, 0 0 20px ${locColor}44`,
              }}
            />
            <h3
              className="text-base font-black leading-tight"
              style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}
            >
              {loc.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-opacity hover:opacity-80"
            style={{ color: `${locColor}99`, background: `${locColor}14` }}
          >
            ✕
          </button>
        </div>
        {loc.era && (
          <div className="flex items-center gap-2 mt-2.5 ml-6">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: eraColor }} />
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{
                color: eraColor,
                background: `${eraColor}14`,
                padding: '2px 7px',
                borderRadius: 6,
              }}
            >
              {loc.era}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Significance quote block */}
        <div
          className="rounded-lg px-4 py-2.5"
          style={{
            borderLeft: `3px solid ${locColor}`,
            background: `${locColor}0a`,
          }}
        >
          <p
            className="text-xs font-semibold italic leading-relaxed"
            style={{ color: '#fcd97a', fontFamily: 'Georgia, serif' }}
          >
            {loc.significance}
          </p>
        </div>

        {/* Description */}
        <p
          className="text-xs leading-[1.75]"
          style={{ color: 'rgba(232,240,236,0.72)', fontFamily: 'Georgia, serif' }}
        >
          {loc.description}
        </p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BibleMaps({ accentColor, onNavigateToRead }: Props) {
  const [selectedMap, setSelectedMap] = useState<BibleMap | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [locListOpen, setLocListOpen] = useState(false);

  const handleBack = useCallback(() => {
    setSelectedMap(null);
    setSelectedLocation(null);
    setLocListOpen(false);
  }, []);

  // ── Detail view ────────────────────────────────────────────────────────────

  if (selectedMap) {
    const accentHex = selectedMap.accentHex;

    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 active:scale-95"
          style={{ color: accentHex, background: `${accentHex}12`, border: `1px solid ${accentHex}22` }}
        >
          ← All Maps
        </button>

        {/* Map title card */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: `linear-gradient(135deg, ${accentHex}12, ${accentHex}04)`,
            border: `1px solid ${accentHex}28`,
            boxShadow: `0 0 32px ${accentHex}10`,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: `${accentHex}18`,
                border: `1px solid ${accentHex}28`,
                boxShadow: `0 0 18px ${accentHex}22`,
              }}
            >
              <span style={{ fontSize: 28 }}>{selectedMap.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2
                  className="text-lg font-black leading-tight"
                  style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}
                >
                  {selectedMap.title}
                </h2>
                {selectedMap.isJourney && (
                  <span
                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: `${accentHex}20`, color: accentHex }}
                  >
                    Journey
                  </span>
                )}
              </div>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: 'rgba(232,240,236,0.55)', fontFamily: 'Georgia, serif' }}
              >
                {selectedMap.description}
              </p>
            </div>
          </div>
        </div>

        {/* Map */}
        <MapboxView
          map={selectedMap}
          onLocationTap={setSelectedLocation}
          selectedLocation={selectedLocation}
        />

        {/* Tap hint */}
        {!selectedLocation && (
          <p
            className="text-center text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: `${accentHex}44` }}
          >
            Tap any pin to explore that location
          </p>
        )}

        {/* Location detail panel */}
        {selectedLocation && (
          <LocationDetail
            loc={selectedLocation}
            accentHex={accentHex}
            onClose={() => setSelectedLocation(null)}
          />
        )}

        {/* Location list — collapsible */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${accentHex}20`, background: `${accentHex}06` }}
        >
          {/* Header / toggle */}
          <button
            onClick={() => setLocListOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 transition-opacity hover:opacity-80 active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-0.5 h-4 rounded-full" style={{ background: accentHex }} />
              <span
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: `${accentHex}99` }}
              >
                {selectedMap.locations.length} Locations
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Location chips preview when collapsed */}
              {!locListOpen && (
                <div className="flex gap-1 flex-wrap justify-end max-w-[170px]">
                  {selectedMap.locations.slice(0, 4).map(l => (
                    <span
                      key={l.name}
                      className="text-[7px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${l.color || accentHex}18`, color: `${l.color || accentHex}cc` }}
                    >
                      {l.name.split(' ')[0]}
                    </span>
                  ))}
                  {selectedMap.locations.length > 4 && (
                    <span
                      className="text-[7px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${accentHex}12`, color: `${accentHex}77` }}
                    >
                      +{selectedMap.locations.length - 4}
                    </span>
                  )}
                </div>
              )}
              <span
                className="text-[11px] font-black transition-transform"
                style={{
                  color: `${accentHex}66`,
                  transform: locListOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                }}
              >
                ▾
              </span>
            </div>
          </button>

          {/* Expanded list */}
          {locListOpen && (
            <div className="px-3 pb-3 space-y-1.5">
              {selectedMap.locations.map((loc, idx) => {
                const isSelected = selectedLocation?.name === loc.name;
                const locColor = loc.color || accentHex;
                const eraColor = ERA_COLORS[loc.era || ''] || accentHex;
                const isPrimary = loc.tier === 'primary' || idx < 3;

                return (
                  <button
                    key={loc.name}
                    onClick={() => setSelectedLocation(loc)}
                    className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all active:scale-[0.98]"
                    style={
                      isSelected
                        ? { background: `${locColor}14`, border: `1px solid ${locColor}30`, borderLeft: `3px solid ${locColor}` }
                        : { background: 'rgba(255,255,255,0.02)', border: '1px solid transparent', borderLeft: `3px solid ${locColor}44` }
                    }
                  >
                    <div
                      style={{
                        width: isPrimary ? 10 : 7,
                        height: isPrimary ? 10 : 7,
                        borderRadius: '50%',
                        background: locColor,
                        boxShadow: `0 0 8px ${locColor}77`,
                        flexShrink: 0,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: isSelected ? '#f5efe0' : 'rgba(245,239,224,0.82)' }}>
                        {loc.name}
                      </p>
                      <p className="text-[9px] truncate mt-0.5" style={{ color: 'rgba(232,220,190,0.38)', fontFamily: 'Georgia,serif' }}>
                        {loc.significance}
                      </p>
                    </div>
                    {loc.era && (
                      <span
                        className="text-[7px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: `${eraColor}16`, color: eraColor }}
                      >
                        {loc.era}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Read in Scripture */}
        {selectedMap.relatedPassages.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-0.5 h-4 rounded-full" style={{ background: accentHex }} />
              <p
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: `${accentHex}77` }}
              >
                Read in Scripture
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedMap.relatedPassages.map(p => (
                <button
                  key={p.ref}
                  onClick={() => {
                    const book = BOOKS.find(b => b.name === p.bookName);
                    if (book) onNavigateToRead(book, p.chapter);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 hover:opacity-90"
                  style={{
                    background: `${accentHex}14`,
                    color: accentHex,
                    border: `1px solid ${accentHex}28`,
                    boxShadow: `0 0 10px ${accentHex}12`,
                  }}
                >
                  {p.ref} →
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Selection screen ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pb-1">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-1 h-8 rounded-full"
            style={{ background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}44)` }}
          />
          <div>
            <h2
              className="text-xl font-black tracking-tight leading-none"
              style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}
            >
              Bible Maps
            </h2>
            <p
              className="text-[10px] mt-1"
              style={{ color: 'rgba(232,240,236,0.38)', fontFamily: 'Georgia, serif' }}
            >
              Explore the sacred geography of Scripture
            </p>
          </div>
        </div>
        {/* Decorative rule */}
        <div
          className="h-px mt-3 rounded-full"
          style={{
            background: `linear-gradient(to right, ${accentColor}44, ${accentColor}08, transparent)`,
          }}
        />
      </div>

      {/* Map cards */}
      <div className="grid grid-cols-1 gap-3">
        {MAPS.map(m => {
          const previewLocs = m.locations.slice(0, 4);
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMap(m)}
              className="text-left rounded-2xl transition-all active:scale-[0.98] relative overflow-hidden"
              style={{
                background: categoryGradient(m.category, m.accentHex),
                border: `1px solid ${m.accentHex}28`,
                padding: 18,
              }}
            >
              {/* Hover overlay */}
              <div
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity rounded-2xl"
                style={{ background: `${m.accentHex}07` }}
              />

              <div className="relative">
                {/* Top row: icon + title */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: `${m.accentHex}18`,
                      border: `1px solid ${m.accentHex}28`,
                      boxShadow: `0 0 20px ${m.accentHex}22`,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{m.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3
                        className="text-base font-black leading-tight"
                        style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}
                      >
                        {m.title}
                      </h3>
                      <span
                        className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: `${m.accentHex}1a`, color: `${m.accentHex}cc` }}
                      >
                        {m.category}
                      </span>
                    </div>

                    <p
                      className="text-[10px] leading-relaxed"
                      style={{ color: 'rgba(232,240,236,0.48)', fontFamily: 'Georgia, serif' }}
                    >
                      {m.description}
                    </p>
                  </div>
                </div>

                {/* Location preview chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {previewLocs.map(loc => (
                    <span
                      key={loc.name}
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${m.accentHex}12`,
                        color: `${m.accentHex}bb`,
                        border: `1px solid ${m.accentHex}1e`,
                      }}
                    >
                      {loc.name}
                    </span>
                  ))}
                  {m.locations.length > 4 && (
                    <span
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${m.accentHex}0a`,
                        color: `${m.accentHex}66`,
                        border: `1px solid ${m.accentHex}14`,
                      }}
                    >
                      +{m.locations.length - 4} more
                    </span>
                  )}
                </div>

                {/* Stat row */}
                <p
                  className="text-[9px] font-black uppercase tracking-widest mt-2.5"
                  style={{ color: `${m.accentHex}66` }}
                >
                  {m.locations.length} locations · {m.category} · Tap to explore →
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
