'use client';

import { useState, useCallback } from 'react';
import { T, BOOKS, BookDef } from '../types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  accentColor: string;
  onNavigateToRead: (book: { name: string; osis: string; chapters: number }, chapter: number) => void;
}

interface Prophecy {
  prophecy: string;
  otRef: string;
  otText: string;
  ntRef: string;
  ntText: string;
  yearWritten: string;
  category: Category;
}

type Category =
  | 'Birth & Origin'
  | 'Life & Ministry'
  | 'Death & Crucifixion'
  | 'Resurrection & Ascension'
  | 'Character & Nature'
  | 'Rejection & Betrayal'
  | 'Priesthood & Kingship'
  | 'Second Coming & Reign';

const CATEGORIES: Category[] = [
  'Birth & Origin',
  'Character & Nature',
  'Life & Ministry',
  'Rejection & Betrayal',
  'Death & Crucifixion',
  'Resurrection & Ascension',
  'Priesthood & Kingship',
  'Second Coming & Reign',
];

const CATEGORY_ICONS: Record<Category, string> = {
  'Birth & Origin': '\u2B50',
  'Character & Nature': '\uD83D\uDC51',
  'Life & Ministry': '\u2728',
  'Rejection & Betrayal': '\uD83D\uDDE1\uFE0F',
  'Death & Crucifixion': '\u271A',
  'Resurrection & Ascension': '\u2600\uFE0F',
  'Priesthood & Kingship': '\uD83C\uDFDB\uFE0F',
  'Second Coming & Reign': '\uD83C\uDF1F',
};

/* ------------------------------------------------------------------ */
/*  Prophecy Data (300+ entries, KJV text)                             */
/* ------------------------------------------------------------------ */

const PROPHECIES: Prophecy[] = [
  // ══════════════════════════════════════════════════════════════════
  //  BIRTH & ORIGIN
  // ══════════════════════════════════════════════════════════════════
  {
    prophecy: 'Born of the seed of a woman',
    otRef: 'Genesis 3:15',
    otText: 'And I will put enmity between thee and the woman, and between thy seed and her seed; it shall bruise thy head, and thou shalt bruise his heel.',
    ntRef: 'Galatians 4:4',
    ntText: 'But when the fulness of the time was come, God sent forth his Son, made of a woman, made under the law.',
    yearWritten: '~1400 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Seed of Abraham',
    otRef: 'Genesis 12:3',
    otText: 'And I will bless them that bless thee, and curse him that curseth thee: and in thee shall all families of the earth be blessed.',
    ntRef: 'Galatians 3:8',
    ntText: 'And the scripture, foreseeing that God would justify the heathen through faith, preached before the gospel unto Abraham, saying, In thee shall all nations be blessed.',
    yearWritten: '~1400 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Seed of Isaac',
    otRef: 'Genesis 21:12',
    otText: 'And God said unto Abraham, Let it not be grievous in thy sight... for in Isaac shall thy seed be called.',
    ntRef: 'Luke 3:34',
    ntText: 'Which was the son of Jacob, which was the son of Isaac, which was the son of Abraham...',
    yearWritten: '~1400 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Seed of Jacob',
    otRef: 'Numbers 24:17',
    otText: 'I shall see him, but not now: I shall behold him, but not nigh: there shall come a Star out of Jacob, and a Sceptre shall rise out of Israel...',
    ntRef: 'Matthew 1:2',
    ntText: 'Abraham begat Isaac; and Isaac begat Jacob; and Jacob begat Judas and his brethren.',
    yearWritten: '~1400 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'From the tribe of Judah',
    otRef: 'Genesis 49:10',
    otText: 'The sceptre shall not depart from Judah, nor a lawgiver from between his feet, until Shiloh come; and unto him shall the gathering of the people be.',
    ntRef: 'Luke 3:33',
    ntText: 'Which was the son of Aminadab, which was the son of Aram, which was the son of Esrom, which was the son of Phares, which was the son of Juda.',
    yearWritten: '~1400 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'From the line of David',
    otRef: 'Jeremiah 23:5',
    otText: 'Behold, the days come, saith the LORD, that I will raise unto David a righteous Branch, and a King shall reign and prosper...',
    ntRef: 'Matthew 1:1',
    ntText: 'The book of the generation of Jesus Christ, the son of David, the son of Abraham.',
    yearWritten: '~600 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Heir to the throne of David',
    otRef: 'Isaiah 9:7',
    otText: 'Of the increase of his government and peace there shall be no end, upon the throne of David, and upon his kingdom, to order it...',
    ntRef: 'Luke 1:32-33',
    ntText: 'He shall be great, and shall be called the Son of the Highest: and the Lord God shall give unto him the throne of his father David.',
    yearWritten: '~700 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Born of a virgin',
    otRef: 'Isaiah 7:14',
    otText: 'Therefore the Lord himself shall give you a sign; Behold, a virgin shall conceive, and bear a son, and shall call his name Immanuel.',
    ntRef: 'Matthew 1:22-23',
    ntText: 'Behold, a virgin shall be with child, and shall bring forth a son, and they shall call his name Emmanuel, which being interpreted is, God with us.',
    yearWritten: '~700 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Born in Bethlehem',
    otRef: 'Micah 5:2',
    otText: 'But thou, Bethlehem Ephratah, though thou be little among the thousands of Judah, yet out of thee shall he come forth unto me that is to be ruler in Israel...',
    ntRef: 'Matthew 2:1',
    ntText: 'Now when Jesus was born in Bethlehem of Judaea in the days of Herod the king, behold, there came wise men from the east to Jerusalem.',
    yearWritten: '~700 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Called out of Egypt',
    otRef: 'Hosea 11:1',
    otText: 'When Israel was a child, then I loved him, and called my son out of Egypt.',
    ntRef: 'Matthew 2:14-15',
    ntText: '...he took the young child and his mother by night, and departed into Egypt... that it might be fulfilled, Out of Egypt have I called my son.',
    yearWritten: '~750 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Slaughter of innocents',
    otRef: 'Jeremiah 31:15',
    otText: 'Thus saith the LORD; A voice was heard in Ramah, lamentation, and bitter weeping; Rahel weeping for her children...',
    ntRef: 'Matthew 2:16-18',
    ntText: 'Then Herod... sent forth, and slew all the children that were in Bethlehem... from two years old and under.',
    yearWritten: '~600 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Preceded by a messenger',
    otRef: 'Isaiah 40:3',
    otText: 'The voice of him that crieth in the wilderness, Prepare ye the way of the LORD, make straight in the desert a highway for our God.',
    ntRef: 'Matthew 3:1-3',
    ntText: 'In those days came John the Baptist, preaching in the wilderness of Judaea... The voice of one crying in the wilderness, Prepare ye the way of the Lord.',
    yearWritten: '~700 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'A star would announce Him',
    otRef: 'Numbers 24:17',
    otText: 'There shall come a Star out of Jacob, and a Sceptre shall rise out of Israel...',
    ntRef: 'Matthew 2:2',
    ntText: 'Saying, Where is he that is born King of the Jews? for we have seen his star in the east, and are come to worship him.',
    yearWritten: '~1400 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Presented with gifts',
    otRef: 'Psalm 72:10',
    otText: 'The kings of Tarshish and of the isles shall bring presents: the kings of Sheba and Seba shall offer gifts.',
    ntRef: 'Matthew 2:11',
    ntText: 'And when they were come into the house, they saw the young child with Mary his mother... and presented unto him gifts; gold, and frankincense, and myrrh.',
    yearWritten: '~1000 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Gentiles would worship Him',
    otRef: 'Isaiah 60:3',
    otText: 'And the Gentiles shall come to thy light, and kings to the brightness of thy rising.',
    ntRef: 'Matthew 2:1-2',
    ntText: 'There came wise men from the east to Jerusalem, Saying, Where is he that is born King of the Jews?',
    yearWritten: '~700 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Called a Nazarene',
    otRef: 'Isaiah 11:1',
    otText: 'And there shall come forth a rod out of the stem of Jesse, and a Branch shall grow out of his roots.',
    ntRef: 'Matthew 2:23',
    ntText: 'And he came and dwelt in a city called Nazareth: that it might be fulfilled which was spoken by the prophets, He shall be called a Nazarene.',
    yearWritten: '~700 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'From the line of Jesse',
    otRef: 'Isaiah 11:1',
    otText: 'And there shall come forth a rod out of the stem of Jesse, and a Branch shall grow out of his roots.',
    ntRef: 'Romans 15:12',
    ntText: 'And again, Esaias saith, There shall be a root of Jesse, and he that shall rise to reign over the Gentiles; in him shall the Gentiles trust.',
    yearWritten: '~700 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Born at a specific time (Daniel\'s 69 weeks)',
    otRef: 'Daniel 9:25',
    otText: 'Know therefore and understand, that from the going forth of the commandment to restore and to build Jerusalem unto the Messiah the Prince shall be seven weeks, and threescore and two weeks...',
    ntRef: 'Luke 2:1-2',
    ntText: 'And it came to pass in those days, that there went out a decree from Caesar Augustus, that all the world should be taxed.',
    yearWritten: '~530 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Born before the second temple destroyed',
    otRef: 'Haggai 2:6-9',
    otText: 'For thus saith the LORD of hosts; Yet once, it is a little while, and I will shake the heavens... and the desire of all nations shall come...',
    ntRef: 'Luke 2:27-32',
    ntText: 'And he came by the Spirit into the temple... Lord, now lettest thou thy servant depart in peace... for mine eyes have seen thy salvation.',
    yearWritten: '~520 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Seed of a woman, not of a man',
    otRef: 'Genesis 3:15',
    otText: 'And I will put enmity between thee and the woman, and between thy seed and her seed...',
    ntRef: 'Matthew 1:18',
    ntText: 'Now the birth of Jesus Christ was on this wise: When as his mother Mary was espoused to Joseph, before they came together, she was found with child of the Holy Ghost.',
    yearWritten: '~1400 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Son of the Highest',
    otRef: '2 Samuel 7:14',
    otText: 'I will be his father, and he shall be my son.',
    ntRef: 'Luke 1:32',
    ntText: 'He shall be great, and shall be called the Son of the Highest...',
    yearWritten: '~1000 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Called Immanuel — God with us',
    otRef: 'Isaiah 7:14',
    otText: '...and shall call his name Immanuel.',
    ntRef: 'Matthew 1:23',
    ntText: 'They shall call his name Emmanuel, which being interpreted is, God with us.',
    yearWritten: '~700 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'The messenger Elijah before the Lord',
    otRef: 'Malachi 4:5',
    otText: 'Behold, I will send you Elijah the prophet before the coming of the great and dreadful day of the LORD.',
    ntRef: 'Matthew 11:13-14',
    ntText: 'For all the prophets and the law prophesied until John. And if ye will receive it, this is Elias, which was for to come.',
    yearWritten: '~430 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Messenger sent to prepare the way',
    otRef: 'Malachi 3:1',
    otText: 'Behold, I will send my messenger, and he shall prepare the way before me...',
    ntRef: 'Mark 1:2-4',
    ntText: 'As it is written in the prophets, Behold, I send my messenger before thy face, which shall prepare thy way before thee.',
    yearWritten: '~430 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Son of God declared',
    otRef: 'Psalm 2:7',
    otText: 'I will declare the decree: the LORD hath said unto me, Thou art my Son; this day have I begotten thee.',
    ntRef: 'Matthew 3:17',
    ntText: 'And lo a voice from heaven, saying, This is my beloved Son, in whom I am well pleased.',
    yearWritten: '~1000 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Descendant of Solomon',
    otRef: '2 Samuel 7:12-13',
    otText: 'I will set up thy seed after thee... He shall build an house for my name, and I will stablish the throne of his kingdom for ever.',
    ntRef: 'Matthew 1:6',
    ntText: 'And Jesse begat David the king; and David the king begat Solomon...',
    yearWritten: '~1000 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Descendant of Zerubbabel',
    otRef: 'Haggai 2:23',
    otText: 'In that day, saith the LORD of hosts, will I take thee, O Zerubbabel, my servant... and will make thee as a signet...',
    ntRef: 'Matthew 1:12-13',
    ntText: 'And after they were brought to Babylon, Jechonias begat Salathiel; and Salathiel begat Zorobabel.',
    yearWritten: '~520 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Adored by infants',
    otRef: 'Psalm 8:2',
    otText: 'Out of the mouth of babes and sucklings hast thou ordained strength because of thine enemies...',
    ntRef: 'Matthew 21:15-16',
    ntText: 'And said unto him, Hearest thou what these say? And Jesus saith unto them, Yea; have ye never read, Out of the mouth of babes and sucklings thou hast perfected praise?',
    yearWritten: '~1000 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'Would be called Lord',
    otRef: 'Psalm 110:1',
    otText: 'The LORD said unto my Lord, Sit thou at my right hand, until I make thine enemies thy footstool.',
    ntRef: 'Luke 20:41-44',
    ntText: 'And he said unto them, How say they that Christ is David\'s son? ...David therefore calleth him Lord, how is he then his son?',
    yearWritten: '~1000 BC',
    category: 'Birth & Origin',
  },
  {
    prophecy: 'His pre-existence',
    otRef: 'Micah 5:2',
    otText: '...whose goings forth have been from of old, from everlasting.',
    ntRef: 'Colossians 1:17',
    ntText: 'And he is before all things, and by him all things consist.',
    yearWritten: '~700 BC',
    category: 'Birth & Origin',
  },

  // ══════════════════════════════════════════════════════════════════
  //  CHARACTER & NATURE
  // ══════════════════════════════════════════════════════════════════
  {
    prophecy: 'Called Wonderful, Counsellor',
    otRef: 'Isaiah 9:6',
    otText: 'For unto us a child is born... and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace.',
    ntRef: 'Luke 4:22',
    ntText: 'And all bare him witness, and wondered at the gracious words which proceeded out of his mouth.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Called the Mighty God',
    otRef: 'Isaiah 9:6',
    otText: '...his name shall be called... The mighty God...',
    ntRef: 'John 1:1',
    ntText: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Called the Everlasting Father',
    otRef: 'Isaiah 9:6',
    otText: '...his name shall be called... The everlasting Father...',
    ntRef: 'John 10:30',
    ntText: 'I and my Father are one.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Called the Prince of Peace',
    otRef: 'Isaiah 9:6',
    otText: '...his name shall be called... The Prince of Peace.',
    ntRef: 'Ephesians 2:14',
    ntText: 'For he is our peace, who hath made both one, and hath broken down the middle wall of partition between us.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'The Spirit of the Lord upon Him',
    otRef: 'Isaiah 11:2',
    otText: 'And the spirit of the LORD shall rest upon him, the spirit of wisdom and understanding, the spirit of counsel and might...',
    ntRef: 'Matthew 3:16',
    ntText: 'And Jesus, when he was baptized, went up straightway out of the water: and, lo, the heavens were opened unto him, and he saw the Spirit of God descending like a dove...',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Full of wisdom and understanding',
    otRef: 'Isaiah 11:2',
    otText: '...the spirit of wisdom and understanding, the spirit of counsel and might, the spirit of knowledge and of the fear of the LORD.',
    ntRef: 'Luke 2:52',
    ntText: 'And Jesus increased in wisdom and stature, and in favour with God and man.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would not cry out in the streets',
    otRef: 'Isaiah 42:2',
    otText: 'He shall not cry, nor lift up, nor cause his voice to be heard in the street.',
    ntRef: 'Matthew 12:15-19',
    ntText: 'But when Jesus knew it, he withdrew himself from thence... and charged them that they should not make him known: That it might be fulfilled which was spoken by Esaias the prophet...',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'A bruised reed He would not break',
    otRef: 'Isaiah 42:3',
    otText: 'A bruised reed shall he not break, and the smoking flax shall he not quench: he shall bring forth judgment unto truth.',
    ntRef: 'Matthew 12:20',
    ntText: 'A bruised reed shall he not break, and smoking flax shall he not quench, till he send forth judgment unto victory.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would be meek and humble',
    otRef: 'Zechariah 9:9',
    otText: '...he is just, and having salvation; lowly, and riding upon an ass...',
    ntRef: 'Matthew 11:29',
    ntText: 'Take my yoke upon you, and learn of me; for I am meek and lowly in heart: and ye shall find rest unto your souls.',
    yearWritten: '~520 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Without guile or deceit',
    otRef: 'Isaiah 53:9',
    otText: '...because he had done no violence, neither was any deceit in his mouth.',
    ntRef: '1 Peter 2:22',
    ntText: 'Who did no sin, neither was guile found in his mouth.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'The Righteous Servant',
    otRef: 'Isaiah 53:11',
    otText: '...by his knowledge shall my righteous servant justify many; for he shall bear their iniquities.',
    ntRef: '1 John 2:1',
    ntText: '...we have an advocate with the Father, Jesus Christ the righteous.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Called the Branch',
    otRef: 'Zechariah 3:8',
    otText: '...behold, I will bring forth my servant the BRANCH.',
    ntRef: 'John 15:5',
    ntText: 'I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit...',
    yearWritten: '~520 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'The Righteous Branch of David',
    otRef: 'Jeremiah 23:5',
    otText: '...I will raise unto David a righteous Branch, and a King shall reign and prosper...',
    ntRef: 'Revelation 22:16',
    ntText: 'I Jesus have sent mine angel to testify unto you these things in the churches. I am the root and the offspring of David...',
    yearWritten: '~600 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'The chosen one of God',
    otRef: 'Isaiah 42:1',
    otText: 'Behold my servant, whom I uphold; mine elect, in whom my soul delighteth; I have put my spirit upon him...',
    ntRef: 'Matthew 12:17-18',
    ntText: 'That it might be fulfilled which was spoken by Esaias the prophet, saying, Behold my servant, whom I have chosen; my beloved, in whom my soul is well pleased...',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would bring justice to the nations',
    otRef: 'Isaiah 42:1',
    otText: '...he shall bring forth judgment to the Gentiles.',
    ntRef: 'Matthew 12:18',
    ntText: '...and he shall shew judgment to the Gentiles.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'A light to the Gentiles',
    otRef: 'Isaiah 42:6',
    otText: 'I the LORD have called thee in righteousness... and give thee for a covenant of the people, for a light of the Gentiles.',
    ntRef: 'Luke 2:32',
    ntText: 'A light to lighten the Gentiles, and the glory of thy people Israel.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would be compassionate',
    otRef: 'Isaiah 40:11',
    otText: 'He shall feed his flock like a shepherd: he shall gather the lambs with his arm, and carry them in his bosom...',
    ntRef: 'John 10:11',
    ntText: 'I am the good shepherd: the good shepherd giveth his life for the sheep.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would be righteous',
    otRef: 'Jeremiah 23:6',
    otText: '...this is his name whereby he shall be called, THE LORD OUR RIGHTEOUSNESS.',
    ntRef: '1 Corinthians 1:30',
    ntText: 'But of him are ye in Christ Jesus, who of God is made unto us wisdom, and righteousness, and sanctification, and redemption.',
    yearWritten: '~600 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would be faithful and true',
    otRef: 'Isaiah 11:5',
    otText: 'And righteousness shall be the girdle of his loins, and faithfulness the girdle of his reins.',
    ntRef: 'Revelation 19:11',
    ntText: 'And I saw heaven opened, and behold a white horse; and he that sat upon him was called Faithful and True...',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Called the Holy One',
    otRef: 'Psalm 16:10',
    otText: '...neither wilt thou suffer thine Holy One to see corruption.',
    ntRef: 'Acts 3:14',
    ntText: 'But ye denied the Holy One and the Just, and desired a murderer to be granted unto you.',
    yearWritten: '~1000 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Called the Cornerstone',
    otRef: 'Isaiah 28:16',
    otText: 'Behold, I lay in Zion for a foundation a stone, a tried stone, a precious corner stone, a sure foundation...',
    ntRef: 'Ephesians 2:20',
    ntText: 'And are built upon the foundation of the apostles and prophets, Jesus Christ himself being the chief corner stone.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'The rejected cornerstone',
    otRef: 'Psalm 118:22',
    otText: 'The stone which the builders refused is become the head stone of the corner.',
    ntRef: 'Matthew 21:42',
    ntText: 'Jesus saith unto them, Did ye never read in the scriptures, The stone which the builders rejected, the same is become the head of the corner...',
    yearWritten: '~1000 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would be filled with God\'s Spirit',
    otRef: 'Isaiah 11:2',
    otText: 'And the spirit of the LORD shall rest upon him, the spirit of wisdom and understanding...',
    ntRef: 'John 3:34',
    ntText: 'For he whom God hath sent speaketh the words of God: for God giveth not the Spirit by measure unto him.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Would judge with righteousness',
    otRef: 'Isaiah 11:3-4',
    otText: '...he shall not judge after the sight of his eyes... but with righteousness shall he judge the poor...',
    ntRef: 'John 5:30',
    ntText: 'I can of mine own self do nothing: as I hear, I judge: and my judgment is just; because I seek not mine own will...',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would be obedient to God',
    otRef: 'Psalm 40:8',
    otText: 'I delight to do thy will, O my God: yea, thy law is within my heart.',
    ntRef: 'John 4:34',
    ntText: 'Jesus saith unto them, My meat is to do the will of him that sent me, and to finish his work.',
    yearWritten: '~1000 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would have zeal for God',
    otRef: 'Psalm 69:9',
    otText: 'For the zeal of thine house hath eaten me up; and the reproaches of them that reproached thee are fallen upon me.',
    ntRef: 'John 2:17',
    ntText: 'And his disciples remembered that it was written, The zeal of thine house hath eaten me up.',
    yearWritten: '~1000 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would be anointed with the oil of gladness',
    otRef: 'Psalm 45:7',
    otText: 'Thou lovest righteousness, and hatest wickedness: therefore God, thy God, hath anointed thee with the oil of gladness above thy fellows.',
    ntRef: 'Hebrews 1:9',
    ntText: 'Thou hast loved righteousness, and hated iniquity; therefore God, even thy God, hath anointed thee with the oil of gladness above thy fellows.',
    yearWritten: '~1000 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would not fail nor be discouraged',
    otRef: 'Isaiah 42:4',
    otText: 'He shall not fail nor be discouraged, till he have set judgment in the earth...',
    ntRef: 'Philippians 2:8',
    ntText: 'And being found in fashion as a man, he humbled himself, and became obedient unto death, even the death of the cross.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Called the Servant of God',
    otRef: 'Isaiah 42:1',
    otText: 'Behold my servant, whom I uphold...',
    ntRef: 'Matthew 12:18',
    ntText: 'Behold my servant, whom I have chosen...',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'Called the Lamb of God',
    otRef: 'Isaiah 53:7',
    otText: '...he is brought as a lamb to the slaughter...',
    ntRef: 'John 1:29',
    ntText: 'Behold the Lamb of God, which taketh away the sin of the world.',
    yearWritten: '~700 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'The Word of God',
    otRef: 'Psalm 33:6',
    otText: 'By the word of the LORD were the heavens made; and all the host of them by the breath of his mouth.',
    ntRef: 'John 1:14',
    ntText: 'And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth.',
    yearWritten: '~1000 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'The image of the invisible God',
    otRef: 'Genesis 1:26',
    otText: 'And God said, Let us make man in our image, after our likeness...',
    ntRef: 'Colossians 1:15',
    ntText: 'Who is the image of the invisible God, the firstborn of every creature.',
    yearWritten: '~1400 BC',
    category: 'Character & Nature',
  },
  {
    prophecy: 'He would speak in parables',
    otRef: 'Psalm 78:2',
    otText: 'I will open my mouth in a parable: I will utter dark sayings of old.',
    ntRef: 'Matthew 13:34',
    ntText: 'All these things spake Jesus unto the multitude in parables; and without a parable spake he not unto them.',
    yearWritten: '~1000 BC',
    category: 'Character & Nature',
  },

  // ══════════════════════════════════════════════════════════════════
  //  LIFE & MINISTRY
  // ══════════════════════════════════════════════════════════════════
  {
    prophecy: 'Ministry in Galilee',
    otRef: 'Isaiah 9:1-2',
    otText: '...the land of Zebulun and the land of Naphtali... Galilee of the nations. The people that walked in darkness have seen a great light...',
    ntRef: 'Matthew 4:13-16',
    ntText: 'And leaving Nazareth, he came and dwelt in Capernaum... That it might be fulfilled which was spoken by Esaias the prophet...',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Would heal the blind, deaf, and lame',
    otRef: 'Isaiah 35:5-6',
    otText: 'Then the eyes of the blind shall be opened, and the ears of the deaf shall be unstopped. Then shall the lame man leap as an hart...',
    ntRef: 'Matthew 11:4-5',
    ntText: 'The blind receive their sight, and the lame walk, the lepers are cleansed, and the deaf hear, the dead are raised up...',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Triumphal entry on a donkey',
    otRef: 'Zechariah 9:9',
    otText: '...behold, thy King cometh unto thee: he is just, and having salvation; lowly, and riding upon an ass, and upon a colt the foal of an ass.',
    ntRef: 'Matthew 21:1-7',
    ntText: 'And the disciples went, and did as Jesus commanded them, And brought the ass, and the colt... and they set him thereon.',
    yearWritten: '~520 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Zeal for God\'s house',
    otRef: 'Psalm 69:9',
    otText: 'For the zeal of thine house hath eaten me up; and the reproaches of them that reproached thee are fallen upon me.',
    ntRef: 'John 2:15-17',
    ntText: '...he drove them all out of the temple... And his disciples remembered that it was written, The zeal of thine house hath eaten me up.',
    yearWritten: '~1000 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'A prophet like Moses',
    otRef: 'Deuteronomy 18:15',
    otText: 'The LORD thy God will raise up unto thee a Prophet from the midst of thee, of thy brethren, like unto me; unto him ye shall hearken.',
    ntRef: 'Acts 3:20-22',
    ntText: '...For Moses truly said unto the fathers, A prophet shall the Lord your God raise up unto you of your brethren, like unto me...',
    yearWritten: '~1400 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Anointed by the Spirit',
    otRef: 'Isaiah 61:1',
    otText: 'The Spirit of the Lord GOD is upon me; because the LORD hath anointed me to preach good tidings unto the meek...',
    ntRef: 'Luke 4:18-21',
    ntText: 'The Spirit of the Lord is upon me, because he hath anointed me to preach the gospel to the poor... This day is this scripture fulfilled in your ears.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Would be a stumbling stone',
    otRef: 'Isaiah 8:14',
    otText: 'And he shall be for a sanctuary; but for a stone of stumbling and for a rock of offence to both the houses of Israel...',
    ntRef: '1 Peter 2:8',
    ntText: 'And a stone of stumbling, and a rock of offence, even to them which stumble at the word, being disobedient...',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would proclaim a year of the Lord\'s favour',
    otRef: 'Isaiah 61:1-2',
    otText: '...to proclaim the acceptable year of the LORD, and the day of vengeance of our God; to comfort all that mourn.',
    ntRef: 'Luke 4:18-19',
    ntText: '...to set at liberty them that are bruised, To preach the acceptable year of the Lord.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would bind up the brokenhearted',
    otRef: 'Isaiah 61:1',
    otText: '...he hath sent me to bind up the brokenhearted, to proclaim liberty to the captives...',
    ntRef: 'Luke 4:18',
    ntText: '...he hath sent me to heal the brokenhearted, to preach deliverance to the captives...',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would perform miracles',
    otRef: 'Isaiah 35:5-6',
    otText: 'Then the eyes of the blind shall be opened, and the ears of the deaf shall be unstopped...',
    ntRef: 'John 11:47',
    ntText: 'Then gathered the chief priests and the Pharisees a council, and said, What do we? for this man doeth many miracles.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Would preach good tidings to the poor',
    otRef: 'Isaiah 61:1',
    otText: '...the LORD hath anointed me to preach good tidings unto the meek...',
    ntRef: 'Matthew 11:5',
    ntText: '...the poor have the gospel preached to them.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would open blind eyes',
    otRef: 'Isaiah 42:7',
    otText: 'To open the blind eyes, to bring out the prisoners from the prison, and them that sit in darkness out of the prison house.',
    ntRef: 'John 9:25-32',
    ntText: '...one thing I know, that, whereas I was blind, now I see... Since the world began was it not heard that any man opened the eyes of one that was born blind.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would raise the dead',
    otRef: 'Isaiah 26:19',
    otText: 'Thy dead men shall live, together with my dead body shall they arise. Awake and sing, ye that dwell in dust...',
    ntRef: 'John 11:43-44',
    ntText: 'And when he thus had spoken, he cried with a loud voice, Lazarus, come forth. And he that was dead came forth...',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would cleanse the lepers',
    otRef: '2 Kings 5:14',
    otText: 'Then went he down, and dipped himself seven times in Jordan... and his flesh came again like unto the flesh of a little child, and he was clean.',
    ntRef: 'Matthew 8:3',
    ntText: 'And Jesus put forth his hand, and touched him, saying, I will; be thou clean. And immediately his leprosy was cleansed.',
    yearWritten: '~550 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would be a shepherd to Israel',
    otRef: 'Ezekiel 34:23',
    otText: 'And I will set up one shepherd over them, and he shall feed them, even my servant David; he shall feed them, and he shall be their shepherd.',
    ntRef: 'John 10:14',
    ntText: 'I am the good shepherd, and know my sheep, and am known of mine.',
    yearWritten: '~590 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would calm the sea',
    otRef: 'Psalm 107:29',
    otText: 'He maketh the storm a calm, so that the waves thereof are still.',
    ntRef: 'Mark 4:39',
    ntText: 'And he arose, and rebuked the wind, and said unto the sea, Peace, be still. And the wind ceased, and there was a great calm.',
    yearWritten: '~1000 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Would enter the temple',
    otRef: 'Malachi 3:1',
    otText: '...the Lord, whom ye seek, shall suddenly come to his temple, even the messenger of the covenant, whom ye delight in...',
    ntRef: 'Matthew 21:12',
    ntText: 'And Jesus went into the temple of God, and cast out all them that sold and bought in the temple...',
    yearWritten: '~430 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would have a ministry of healing',
    otRef: 'Isaiah 53:4',
    otText: 'Surely he hath borne our griefs, and carried our sorrows...',
    ntRef: 'Matthew 8:16-17',
    ntText: '...he cast out the spirits with his word, and healed all that were sick: That it might be fulfilled... Himself took our infirmities, and bare our sicknesses.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would teach with authority',
    otRef: 'Deuteronomy 18:18',
    otText: 'I will raise them up a Prophet from among their brethren, like unto thee, and will put my words in his mouth...',
    ntRef: 'John 7:46',
    ntText: 'The officers answered, Never man spake like this man.',
    yearWritten: '~1400 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would minister to Gentiles',
    otRef: 'Isaiah 49:6',
    otText: '...I will also give thee for a light to the Gentiles, that thou mayest be my salvation unto the end of the earth.',
    ntRef: 'Acts 13:47-48',
    ntText: '...I have set thee to be a light of the Gentiles, that thou shouldest be for salvation unto the ends of the earth. And when the Gentiles heard this, they were glad...',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Would be received by Gentiles',
    otRef: 'Isaiah 11:10',
    otText: 'And in that day there shall be a root of Jesse, which shall stand for an ensign of the people; to it shall the Gentiles seek...',
    ntRef: 'Romans 15:12',
    ntText: '...There shall be a root of Jesse, and he that shall rise to reign over the Gentiles; in him shall the Gentiles trust.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Would feed the hungry multitudes',
    otRef: 'Psalm 132:15',
    otText: 'I will abundantly bless her provision: I will satisfy her poor with bread.',
    ntRef: 'John 6:11-14',
    ntText: 'And Jesus took the loaves; and when he had given thanks, he distributed to the disciples... and likewise of the fishes as much as they would.',
    yearWritten: '~1000 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would walk on water',
    otRef: 'Job 9:8',
    otText: 'Which alone spreadeth out the heavens, and treadeth upon the waves of the sea.',
    ntRef: 'Matthew 14:25',
    ntText: 'And in the fourth watch of the night Jesus went unto them, walking on the sea.',
    yearWritten: '~1400 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Children would praise Him',
    otRef: 'Psalm 8:2',
    otText: 'Out of the mouth of babes and sucklings hast thou ordained strength...',
    ntRef: 'Matthew 21:16',
    ntText: 'And said unto him, Hearest thou what these say? And Jesus saith unto them, Yea; have ye never read, Out of the mouth of babes and sucklings thou hast perfected praise?',
    yearWritten: '~1000 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would proclaim liberty to captives',
    otRef: 'Isaiah 61:1',
    otText: '...to proclaim liberty to the captives, and the opening of the prison to them that are bound.',
    ntRef: 'Luke 4:18',
    ntText: '...to preach deliverance to the captives... to set at liberty them that are bruised.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would comfort those who mourn',
    otRef: 'Isaiah 61:2-3',
    otText: '...to comfort all that mourn; To appoint unto them that mourn in Zion, to give unto them beauty for ashes...',
    ntRef: 'Matthew 5:4',
    ntText: 'Blessed are they that mourn: for they shall be comforted.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would baptize with the Holy Spirit',
    otRef: 'Joel 2:28',
    otText: 'And it shall come to pass afterward, that I will pour out my spirit upon all flesh; and your sons and your daughters shall prophesy...',
    ntRef: 'Acts 2:16-18',
    ntText: 'But this is that which was spoken by the prophet Joel; And it shall come to pass in the last days, saith God, I will pour out of my Spirit upon all flesh...',
    yearWritten: '~800 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'Would have compassion on the afflicted',
    otRef: 'Isaiah 63:9',
    otText: 'In all their affliction he was afflicted, and the angel of his presence saved them: in his love and in his pity he redeemed them...',
    ntRef: 'Mark 1:41',
    ntText: 'And Jesus, moved with compassion, put forth his hand, and touched him, and saith unto him, I will; be thou clean.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would enter Jerusalem on a donkey\'s colt',
    otRef: 'Zechariah 9:9',
    otText: '...riding upon an ass, and upon a colt the foal of an ass.',
    ntRef: 'Luke 19:35-37',
    ntText: 'And they brought him to Jesus: and they cast their garments upon the colt, and they set Jesus thereon.',
    yearWritten: '~520 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'The people would shout Hosanna',
    otRef: 'Psalm 118:26',
    otText: 'Blessed be he that cometh in the name of the LORD: we have blessed you out of the house of the LORD.',
    ntRef: 'Matthew 21:9',
    ntText: 'And the multitudes... cried, saying, Hosanna to the son of David: Blessed is he that cometh in the name of the Lord; Hosanna in the highest.',
    yearWritten: '~1000 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would be a man of sorrows',
    otRef: 'Isaiah 53:3',
    otText: '...a man of sorrows, and acquainted with grief...',
    ntRef: 'John 11:35',
    ntText: 'Jesus wept.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would pray for His enemies',
    otRef: 'Psalm 109:4',
    otText: 'For my love they are my adversaries: but I give myself unto prayer.',
    ntRef: 'Luke 23:34',
    ntText: 'Then said Jesus, Father, forgive them; for they know not what they do.',
    yearWritten: '~1000 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would come to His own temple',
    otRef: 'Malachi 3:1',
    otText: '...the Lord, whom ye seek, shall suddenly come to his temple...',
    ntRef: 'Luke 2:27-32',
    ntText: 'And he came by the Spirit into the temple... mine eyes have seen thy salvation.',
    yearWritten: '~430 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would not seek His own glory',
    otRef: 'Isaiah 42:2',
    otText: 'He shall not cry, nor lift up, nor cause his voice to be heard in the street.',
    ntRef: 'John 8:50',
    ntText: 'And I seek not mine own glory: there is one that seeketh and judgeth.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would open deaf ears',
    otRef: 'Isaiah 29:18',
    otText: 'And in that day shall the deaf hear the words of the book, and the eyes of the blind shall see out of obscurity...',
    ntRef: 'Mark 7:32-35',
    ntText: 'And they bring unto him one that was deaf... And straightway his ears were opened, and the string of his tongue was loosed, and he spake plain.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would speak the words of God',
    otRef: 'Deuteronomy 18:18',
    otText: '...and will put my words in his mouth; and he shall speak unto them all that I shall command him.',
    ntRef: 'John 14:10',
    ntText: '...the words that I speak unto you I speak not of myself: but the Father that dwelleth in me, he doeth the works.',
    yearWritten: '~1400 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would set prisoners free',
    otRef: 'Isaiah 42:7',
    otText: '...to bring out the prisoners from the prison, and them that sit in darkness out of the prison house.',
    ntRef: 'Luke 4:18',
    ntText: '...to preach deliverance to the captives... to set at liberty them that are bruised.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would cast out demons',
    otRef: 'Isaiah 49:24-25',
    otText: 'Shall the prey be taken from the mighty, or the lawful captive delivered? But thus saith the LORD, Even the captives of the mighty shall be taken away...',
    ntRef: 'Luke 11:20',
    ntText: 'But if I with the finger of God cast out devils, no doubt the kingdom of God is come upon you.',
    yearWritten: '~700 BC',
    category: 'Life & Ministry',
  },
  {
    prophecy: 'He would have mercy on the poor',
    otRef: 'Psalm 72:12-13',
    otText: 'For he shall deliver the needy when he crieth; the poor also, and him that hath no helper. He shall spare the poor and needy...',
    ntRef: 'Luke 7:22',
    ntText: '...the blind see, the lame walk, the lepers are cleansed, the deaf hear, the dead are raised, to the poor the gospel is preached.',
    yearWritten: '~1000 BC',
    category: 'Life & Ministry',
  },

  // ══════════════════════════════════════════════════════════════════
  //  REJECTION & BETRAYAL
  // ══════════════════════════════════════════════════════════════════
  {
    prophecy: 'Rejected by His own people',
    otRef: 'Isaiah 53:3',
    otText: 'He is despised and rejected of men; a man of sorrows, and acquainted with grief: and we hid as it were our faces from him...',
    ntRef: 'John 1:11',
    ntText: 'He came unto his own, and his own received him not.',
    yearWritten: '~700 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Betrayed by a friend',
    otRef: 'Psalm 41:9',
    otText: 'Yea, mine own familiar friend, in whom I trusted, which did eat of my bread, hath lifted up his heel against me.',
    ntRef: 'John 13:18-21',
    ntText: '...He that eateth bread with me hath lifted up his heel against me... Verily, verily, I say unto you, that one of you shall betray me.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Betrayed for 30 pieces of silver',
    otRef: 'Zechariah 11:12',
    otText: 'And I said unto them, If ye think good, give me my price; and if not, forbear. So they weighed for my price thirty pieces of silver.',
    ntRef: 'Matthew 26:15',
    ntText: 'And said unto them, What will ye give me, and I will deliver him unto you? And they covenanted with him for thirty pieces of silver.',
    yearWritten: '~520 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Silver thrown in the temple',
    otRef: 'Zechariah 11:13',
    otText: 'And the LORD said unto me, Cast it unto the potter: a goodly price that I was prised at of them. And I took the thirty pieces of silver, and cast them to the potter in the house of the LORD.',
    ntRef: 'Matthew 27:5-7',
    ntText: 'And he cast down the pieces of silver in the temple, and departed... And the chief priests took the silver pieces... and bought with them the potter\'s field.',
    yearWritten: '~520 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Money used to buy potter\'s field',
    otRef: 'Zechariah 11:13',
    otText: '...Cast it unto the potter: a goodly price that I was prised at of them.',
    ntRef: 'Matthew 27:9-10',
    ntText: 'Then was fulfilled that which was spoken by Jeremy the prophet, saying, And they took the thirty pieces of silver... and gave them for the potter\'s field.',
    yearWritten: '~520 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Forsaken by His disciples',
    otRef: 'Zechariah 13:7',
    otText: 'Awake, O sword, against my shepherd... smite the shepherd, and the sheep shall be scattered.',
    ntRef: 'Mark 14:50',
    ntText: 'And they all forsook him, and fled.',
    yearWritten: '~520 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Accused by false witnesses',
    otRef: 'Psalm 35:11',
    otText: 'False witnesses did rise up; they laid to my charge things that I knew not.',
    ntRef: 'Mark 14:57-58',
    ntText: 'And there arose certain, and bare false witness against him, saying, We heard him say, I will destroy this temple that is made with hands...',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Hated without a cause',
    otRef: 'Psalm 69:4',
    otText: 'They that hate me without a cause are more than the hairs of mine head...',
    ntRef: 'John 15:24-25',
    ntText: '...but now have they both seen and hated both me and my Father. But this cometh to pass, that the word might be fulfilled... They hated me without a cause.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Friends stood afar off',
    otRef: 'Psalm 38:11',
    otText: 'My lovers and my friends stand aloof from my sore; and my kinsmen stand afar off.',
    ntRef: 'Luke 23:49',
    ntText: 'And all his acquaintance, and the women that followed him from Galilee, stood afar off, beholding these things.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Betrayed with a kiss',
    otRef: 'Proverbs 27:6',
    otText: 'Faithful are the wounds of a friend; but the kisses of an enemy are deceitful.',
    ntRef: 'Matthew 26:48-49',
    ntText: 'Now he that betrayed him gave them a sign, saying, Whomsoever I shall kiss, that same is he... and kissed him.',
    yearWritten: '~950 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'His office taken by another',
    otRef: 'Psalm 109:8',
    otText: 'Let his days be few; and let another take his office.',
    ntRef: 'Acts 1:20-26',
    ntText: '...Let his habitation be desolate... and his bishoprick let another take... And they gave forth their lots; and the lot fell upon Matthias.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Plotted against by Jews and Gentiles',
    otRef: 'Psalm 2:1-2',
    otText: 'Why do the heathen rage, and the people imagine a vain thing? The kings of the earth set themselves... against the LORD, and against his anointed...',
    ntRef: 'Acts 4:27-28',
    ntText: 'For of a truth against thy holy child Jesus, whom thou hast anointed, both Herod, and Pontius Pilate, with the Gentiles, and the people of Israel, were gathered together...',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'The chief priests would conspire to kill Him',
    otRef: 'Psalm 31:13',
    otText: '...they devised to take away my life.',
    ntRef: 'John 11:53',
    ntText: 'Then from that day forth they took counsel together for to put him to death.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Rejected by the rulers',
    otRef: 'Psalm 118:22',
    otText: 'The stone which the builders refused is become the head stone of the corner.',
    ntRef: 'Matthew 21:42',
    ntText: '...The stone which the builders rejected, the same is become the head of the corner...',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'People shook their heads at Him',
    otRef: 'Psalm 109:25',
    otText: 'I became also a reproach unto them: when they looked upon me they shaked their heads.',
    ntRef: 'Matthew 27:39',
    ntText: 'And they that passed by reviled him, wagging their heads.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Rejected as king',
    otRef: 'Psalm 2:1-3',
    otText: '...Let us break their bands asunder, and cast away their cords from us.',
    ntRef: 'John 19:15',
    ntText: '...Shall I crucify your King? The chief priests answered, We have no king but Caesar.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Hated by His brothers',
    otRef: 'Psalm 69:8',
    otText: 'I am become a stranger unto my brethren, and an alien unto my mother\'s children.',
    ntRef: 'John 7:5',
    ntText: 'For neither did his brethren believe in him.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Betrayer\'s position replaced',
    otRef: 'Psalm 109:7-8',
    otText: 'When he shall be judged, let him be condemned... Let his days be few; and let another take his office.',
    ntRef: 'Acts 1:16-20',
    ntText: '...this scripture must needs have been fulfilled, which the Holy Ghost by the mouth of David spake before concerning Judas... his bishoprick let another take.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Enemies would be at his table',
    otRef: 'Psalm 41:9',
    otText: 'Yea, mine own familiar friend, in whom I trusted, which did eat of my bread, hath lifted up his heel against me.',
    ntRef: 'Luke 22:21',
    ntText: 'But, behold, the hand of him that betrayeth me is with me on the table.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Spat upon and smitten',
    otRef: 'Isaiah 50:6',
    otText: 'I gave my back to the smiters, and my cheeks to them that plucked off the hair: I hid not my face from shame and spitting.',
    ntRef: 'Matthew 26:67',
    ntText: 'Then did they spit in his face, and buffeted him; and others smote him with the palms of their hands.',
    yearWritten: '~700 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Leaders took counsel against Him',
    otRef: 'Psalm 2:2',
    otText: 'The kings of the earth set themselves, and the rulers take counsel together, against the LORD, and against his anointed...',
    ntRef: 'Matthew 26:3-4',
    ntText: 'Then assembled together the chief priests, and the scribes, and the elders of the people... And consulted that they might take Jesus by subtilty, and kill him.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Silent before His accusers',
    otRef: 'Isaiah 53:7',
    otText: 'He was oppressed, and he was afflicted, yet he opened not his mouth: he is brought as a lamb to the slaughter...',
    ntRef: 'Matthew 27:12-14',
    ntText: 'And when he was accused of the chief priests and elders, he answered nothing... And he answered him to never a word...',
    yearWritten: '~700 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Reproached',
    otRef: 'Psalm 69:9',
    otText: '...the reproaches of them that reproached thee are fallen upon me.',
    ntRef: 'Romans 15:3',
    ntText: 'For even Christ pleased not himself; but, as it is written, The reproaches of them that reproached thee fell on me.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Mocked and ridiculed',
    otRef: 'Psalm 22:7-8',
    otText: 'All they that see me laugh me to scorn: they shoot out the lip, they shake the head, saying, He trusted on the LORD that he would deliver him...',
    ntRef: 'Matthew 27:39-43',
    ntText: 'And they that passed by reviled him, wagging their heads... He trusted in God; let him deliver him now, if he will have him.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'Looked upon with contempt',
    otRef: 'Psalm 22:6',
    otText: 'But I am a worm, and no man; a reproach of men, and despised of the people.',
    ntRef: 'Luke 23:11',
    ntText: 'And Herod with his men of war set him at nought, and mocked him, and arrayed him in a gorgeous robe, and sent him again to Pilate.',
    yearWritten: '~1000 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'A man acquainted with grief',
    otRef: 'Isaiah 53:3',
    otText: '...a man of sorrows, and acquainted with grief...',
    ntRef: 'Luke 19:41',
    ntText: 'And when he was come near, he beheld the city, and wept over it.',
    yearWritten: '~700 BC',
    category: 'Rejection & Betrayal',
  },
  {
    prophecy: 'His own people would not believe',
    otRef: 'Isaiah 53:1',
    otText: 'Who hath believed our report? and to whom is the arm of the LORD revealed?',
    ntRef: 'John 12:37-38',
    ntText: 'But though he had done so many miracles before them, yet they believed not on him: That the saying of Esaias the prophet might be fulfilled...',
    yearWritten: '~700 BC',
    category: 'Rejection & Betrayal',
  },

  // ══════════════════════════════════════════════════════════════════
  //  DEATH & CRUCIFIXION
  // ══════════════════════════════════════════════════════════════════
  {
    prophecy: 'Hands and feet pierced',
    otRef: 'Psalm 22:16',
    otText: 'For dogs have compassed me: the assembly of the wicked have inclosed me: they pierced my hands and my feet.',
    ntRef: 'John 20:25-27',
    ntText: '...Except I shall see in his hands the print of the nails... Then saith he to Thomas, Reach hither thy finger, and behold my hands...',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Crucified with criminals',
    otRef: 'Isaiah 53:12',
    otText: '...he hath poured out his soul unto death: and he was numbered with the transgressors.',
    ntRef: 'Mark 15:27-28',
    ntText: 'And with him they crucify two thieves... And the scripture was fulfilled, which saith, And he was numbered with the transgressors.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Garments divided by casting lots',
    otRef: 'Psalm 22:18',
    otText: 'They part my garments among them, and cast lots upon my vesture.',
    ntRef: 'John 19:23-24',
    ntText: 'Then the soldiers, when they had crucified Jesus, took his garments, and made four parts... They said therefore among themselves, Let us not rend it, but cast lots for it...',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'No bones broken',
    otRef: 'Psalm 34:20',
    otText: 'He keepeth all his bones: not one of them is broken.',
    ntRef: 'John 19:32-33',
    ntText: 'Then came the soldiers, and brake the legs of the first... But when they came to Jesus, and saw that he was dead already, they brake not his legs.',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Side pierced',
    otRef: 'Zechariah 12:10',
    otText: '...they shall look upon me whom they have pierced, and they shall mourn for him.',
    ntRef: 'John 19:34',
    ntText: 'But one of the soldiers with a spear pierced his side, and forthwith came there out blood and water.',
    yearWritten: '~520 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Darkness over the land',
    otRef: 'Amos 8:9',
    otText: '...I will cause the sun to go down at noon, and I will darken the earth in the clear day.',
    ntRef: 'Matthew 27:45',
    ntText: 'Now from the sixth hour there was darkness over all the land unto the ninth hour.',
    yearWritten: '~750 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: '"My God, why hast thou forsaken me"',
    otRef: 'Psalm 22:1',
    otText: 'My God, my God, why hast thou forsaken me? why art thou so far from helping me, and from the words of my roaring?',
    ntRef: 'Matthew 27:46',
    ntText: 'And about the ninth hour Jesus cried with a loud voice, saying, Eli, Eli, lama sabachthani? that is to say, My God, my God, why hast thou forsaken me?',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Buried in a rich man\'s tomb',
    otRef: 'Isaiah 53:9',
    otText: 'And he made his grave with the wicked, and with the rich in his death; because he had done no violence, neither was any deceit in his mouth.',
    ntRef: 'Matthew 27:57-60',
    ntText: '...there came a rich man of Arimathaea, named Joseph, who also himself was Jesus\' disciple... And laid it in his own new tomb.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Given vinegar to drink',
    otRef: 'Psalm 69:21',
    otText: 'They gave me also gall for my meat; and in my thirst they gave me vinegar to drink.',
    ntRef: 'Matthew 27:34',
    ntText: 'They gave him vinegar to drink mingled with gall: and when he had tasted thereof, he would not drink.',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Bore the sin of many',
    otRef: 'Isaiah 53:5',
    otText: 'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.',
    ntRef: '1 Peter 2:24',
    ntText: 'Who his own self bare our sins in his own body on the tree, that we, being dead to sins, should live unto righteousness: by whose stripes ye were healed.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'He would thirst on the cross',
    otRef: 'Psalm 22:15',
    otText: 'My strength is dried up like a potsherd; and my tongue cleaveth to my jaws; and thou hast brought me into the dust of death.',
    ntRef: 'John 19:28',
    ntText: 'After this, Jesus knowing that all things were now accomplished, that the scripture might be fulfilled, saith, I thirst.',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'His bones out of joint',
    otRef: 'Psalm 22:14',
    otText: 'I am poured out like water, and all my bones are out of joint: my heart is like wax; it is melted in the midst of my bowels.',
    ntRef: 'John 19:34',
    ntText: 'But one of the soldiers with a spear pierced his side, and forthwith came there out blood and water.',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Heart melted like wax',
    otRef: 'Psalm 22:14',
    otText: '...my heart is like wax; it is melted in the midst of my bowels.',
    ntRef: 'John 19:34',
    ntText: '...and forthwith came there out blood and water.',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Scourged and wounded',
    otRef: 'Isaiah 53:5',
    otText: '...the chastisement of our peace was upon him; and with his stripes we are healed.',
    ntRef: 'John 19:1',
    ntText: 'Then Pilate therefore took Jesus, and scourged him.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'His visage marred more than any man',
    otRef: 'Isaiah 52:14',
    otText: 'As many were astonied at thee; his visage was so marred more than any man, and his form more than the sons of men.',
    ntRef: 'John 19:1-3',
    ntText: 'Then Pilate therefore took Jesus, and scourged him. And the soldiers platted a crown of thorns, and put it on his head...',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Smitten on the cheek',
    otRef: 'Micah 5:1',
    otText: '...they shall smite the judge of Israel with a rod upon the cheek.',
    ntRef: 'Matthew 27:30',
    ntText: 'And they spit upon him, and took the reed, and smote him on the head.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Stared at on the cross',
    otRef: 'Psalm 22:17',
    otText: 'I may tell all my bones: they look and stare upon me.',
    ntRef: 'Luke 23:35',
    ntText: 'And the people stood beholding. And the rulers also with them derided him...',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: '"Into thy hands I commit my spirit"',
    otRef: 'Psalm 31:5',
    otText: 'Into thine hand I commit my spirit: thou hast redeemed me, O LORD God of truth.',
    ntRef: 'Luke 23:46',
    ntText: 'And when Jesus had cried with a loud voice, he said, Father, into thy hands I commend my spirit: and having said thus, he gave up the ghost.',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Sacrificed at Passover',
    otRef: 'Exodus 12:6',
    otText: 'And ye shall keep it up until the fourteenth day of the same month: and the whole assembly of the congregation of Israel shall kill it in the evening.',
    ntRef: '1 Corinthians 5:7',
    ntText: '...For even Christ our passover is sacrificed for us.',
    yearWritten: '~1400 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Not a bone of the Passover lamb broken',
    otRef: 'Exodus 12:46',
    otText: 'In one house shall it be eaten... neither shall ye break a bone thereof.',
    ntRef: 'John 19:36',
    ntText: 'For these things were done, that the scripture should be fulfilled, A bone of him shall not be broken.',
    yearWritten: '~1400 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'He would be the sin offering',
    otRef: 'Isaiah 53:10',
    otText: 'Yet it pleased the LORD to bruise him; he hath put him to grief: when thou shalt make his soul an offering for sin...',
    ntRef: '2 Corinthians 5:21',
    ntText: 'For he hath made him to be sin for us, who knew no sin; that we might be made the righteousness of God in him.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Cut off from the land of the living',
    otRef: 'Isaiah 53:8',
    otText: '...for he was cut off out of the land of the living: for the transgression of my people was he stricken.',
    ntRef: '1 Peter 3:18',
    ntText: 'For Christ also hath once suffered for sins, the just for the unjust, that he might bring us to God, being put to death in the flesh...',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Blood poured out for atonement',
    otRef: 'Leviticus 17:11',
    otText: 'For the life of the flesh is in the blood: and I have given it to you upon the altar to make an atonement for your souls...',
    ntRef: 'Matthew 26:28',
    ntText: 'For this is my blood of the new testament, which is shed for many for the remission of sins.',
    yearWritten: '~1400 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Forsaken by God on the cross',
    otRef: 'Psalm 22:1',
    otText: 'My God, my God, why hast thou forsaken me?...',
    ntRef: 'Mark 15:34',
    ntText: 'And at the ninth hour Jesus cried with a loud voice, saying, Eloi, Eloi, lama sabachthani? which is, being interpreted, My God, my God, why hast thou forsaken me?',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Crucified on a tree (cursed)',
    otRef: 'Deuteronomy 21:23',
    otText: 'His body shall not remain all night upon the tree... (for he that is hanged is accursed of God)...',
    ntRef: 'Galatians 3:13',
    ntText: 'Christ hath redeemed us from the curse of the law, being made a curse for us: for it is written, Cursed is every one that hangeth on a tree.',
    yearWritten: '~1400 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Would suffer willingly',
    otRef: 'Isaiah 53:7',
    otText: '...he opened not his mouth: he is brought as a lamb to the slaughter...',
    ntRef: 'John 10:17-18',
    ntText: '...I lay down my life, that I might take it again. No man taketh it from me, but I lay it down of myself...',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Suffering was for others',
    otRef: 'Isaiah 53:6',
    otText: 'All we like sheep have gone astray; we have turned every one to his own way; and the LORD hath laid on him the iniquity of us all.',
    ntRef: '1 Peter 2:25',
    ntText: 'For ye were as sheep going astray; but are now returned unto the Shepherd and Bishop of your souls.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'He would make intercession for transgressors',
    otRef: 'Isaiah 53:12',
    otText: '...and he bare the sin of many, and made intercession for the transgressors.',
    ntRef: 'Luke 23:34',
    ntText: 'Then said Jesus, Father, forgive them; for they know not what they do.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Lifted up like the brazen serpent',
    otRef: 'Numbers 21:9',
    otText: 'And Moses made a serpent of brass, and put it upon a pole, and it came to pass, that if a serpent had bitten any man, when he beheld the serpent of brass, he lived.',
    ntRef: 'John 3:14-15',
    ntText: 'And as Moses lifted up the serpent in the wilderness, even so must the Son of man be lifted up: That whosoever believeth in him should not perish...',
    yearWritten: '~1400 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Veil of the temple rent',
    otRef: 'Exodus 26:31-33',
    otText: 'And thou shalt make a vail of blue, and purple, and scarlet... and the vail shall divide unto you between the holy place and the most holy.',
    ntRef: 'Matthew 27:51',
    ntText: 'And, behold, the veil of the temple was rent in twain from the top to the bottom; and the earth did quake, and the rocks rent.',
    yearWritten: '~1400 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Died a voluntary death',
    otRef: 'Isaiah 53:12',
    otText: '...because he hath poured out his soul unto death...',
    ntRef: 'John 19:30',
    ntText: 'When Jesus therefore had received the vinegar, he said, It is finished: and he bowed his head, and gave up the ghost.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Blood and water from His side',
    otRef: 'Zechariah 12:10',
    otText: '...they shall look upon me whom they have pierced...',
    ntRef: 'John 19:34',
    ntText: 'But one of the soldiers with a spear pierced his side, and forthwith came there out blood and water.',
    yearWritten: '~520 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Soldiers would gamble for His garments',
    otRef: 'Psalm 22:18',
    otText: '...and cast lots upon my vesture.',
    ntRef: 'John 19:24',
    ntText: 'They said therefore among themselves, Let us not rend it, but cast lots for it, whose it shall be...',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Buried with the wicked',
    otRef: 'Isaiah 53:9',
    otText: 'And he made his grave with the wicked...',
    ntRef: 'Matthew 27:38',
    ntText: 'Then were there two thieves crucified with him, one on the right hand, and another on the left.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Stripped naked on the cross',
    otRef: 'Psalm 22:17',
    otText: 'I may tell all my bones: they look and stare upon me.',
    ntRef: 'John 19:23',
    ntText: 'Then the soldiers, when they had crucified Jesus, took his garments, and made four parts...',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'The earth would quake at His death',
    otRef: 'Nahum 1:5-6',
    otText: 'The mountains quake at him, and the hills melt, and the earth is burned at his presence...',
    ntRef: 'Matthew 27:51',
    ntText: '...and the earth did quake, and the rocks rent.',
    yearWritten: '~650 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'His back was given to the smiters',
    otRef: 'Isaiah 50:6',
    otText: 'I gave my back to the smiters, and my cheeks to them that plucked off the hair...',
    ntRef: 'Matthew 27:26',
    ntText: '...and when he had scourged Jesus, he delivered him to be crucified.',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'His suffering would satisfy God\'s justice',
    otRef: 'Isaiah 53:11',
    otText: 'He shall see of the travail of his soul, and shall be satisfied...',
    ntRef: 'Romans 3:25',
    ntText: 'Whom God hath set forth to be a propitiation through faith in his blood, to declare his righteousness for the remission of sins that are past...',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'A new covenant through His blood',
    otRef: 'Jeremiah 31:31',
    otText: 'Behold, the days come, saith the LORD, that I will make a new covenant with the house of Israel...',
    ntRef: 'Luke 22:20',
    ntText: '...This cup is the new testament in my blood, which is shed for you.',
    yearWritten: '~600 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Like the Passover lamb — without blemish',
    otRef: 'Exodus 12:5',
    otText: 'Your lamb shall be without blemish, a male of the first year...',
    ntRef: '1 Peter 1:19',
    ntText: 'But with the precious blood of Christ, as of a lamb without blemish and without spot.',
    yearWritten: '~1400 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Suffered outside the gate',
    otRef: 'Leviticus 16:27',
    otText: '...the bullock for the sin offering... shall one carry forth without the camp...',
    ntRef: 'Hebrews 13:12',
    ntText: 'Wherefore Jesus also, that he might sanctify the people with his own blood, suffered without the gate.',
    yearWritten: '~1400 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Would be offered gall and vinegar',
    otRef: 'Psalm 69:21',
    otText: 'They gave me also gall for my meat; and in my thirst they gave me vinegar to drink.',
    ntRef: 'John 19:29',
    ntText: 'Now there was set a vessel full of vinegar: and they filled a spunge with vinegar, and put it upon hyssop, and put it to his mouth.',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'His body would not see corruption',
    otRef: 'Psalm 16:10',
    otText: 'For thou wilt not leave my soul in hell; neither wilt thou suffer thine Holy One to see corruption.',
    ntRef: 'Acts 13:37',
    ntText: 'But he, whom God raised again, saw no corruption.',
    yearWritten: '~1000 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Died at the ninth hour (3 PM)',
    otRef: 'Daniel 9:26',
    otText: 'And after threescore and two weeks shall Messiah be cut off, but not for himself...',
    ntRef: 'Mark 15:33-37',
    ntText: '...at the ninth hour Jesus cried with a loud voice... And Jesus cried with a loud voice, and gave up the ghost.',
    yearWritten: '~530 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Wounded in the house of His friends',
    otRef: 'Zechariah 13:6',
    otText: 'And one shall say unto him, What are these wounds in thine hands? Then he shall answer, Those with which I was wounded in the house of my friends.',
    ntRef: 'John 18:35',
    ntText: '...Thine own nation and the chief priests have delivered thee unto me...',
    yearWritten: '~520 BC',
    category: 'Death & Crucifixion',
  },
  {
    prophecy: 'Spit upon',
    otRef: 'Isaiah 50:6',
    otText: '...I hid not my face from shame and spitting.',
    ntRef: 'Mark 15:19',
    ntText: 'And they smote him on the head with a reed, and did spit upon him...',
    yearWritten: '~700 BC',
    category: 'Death & Crucifixion',
  },

  // ══════════════════════════════════════════════════════════════════
  //  RESURRECTION & ASCENSION
  // ══════════════════════════════════════════════════════════════════
  {
    prophecy: 'Would rise from the dead',
    otRef: 'Psalm 16:10',
    otText: 'For thou wilt not leave my soul in hell; neither wilt thou suffer thine Holy One to see corruption.',
    ntRef: 'Acts 2:31',
    ntText: 'He seeing this before spake of the resurrection of Christ, that his soul was not left in hell, neither his flesh did see corruption.',
    yearWritten: '~1000 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'Ascend to heaven',
    otRef: 'Psalm 68:18',
    otText: 'Thou hast ascended on high, thou hast led captivity captive: thou hast received gifts for men...',
    ntRef: 'Acts 1:9',
    ntText: 'And when he had spoken these things, while they beheld, he was taken up; and a cloud received him out of their sight.',
    yearWritten: '~1000 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'Seated at God\'s right hand',
    otRef: 'Psalm 110:1',
    otText: 'The LORD said unto my Lord, Sit thou at my right hand, until I make thine enemies thy footstool.',
    ntRef: 'Hebrews 1:3',
    ntText: '...when he had by himself purged our sins, sat down on the right hand of the Majesty on high.',
    yearWritten: '~1000 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'Resurrection on the third day',
    otRef: 'Hosea 6:2',
    otText: 'After two days will he revive us: in the third day he will raise us up, and we shall live in his sight.',
    ntRef: '1 Corinthians 15:4',
    ntText: 'And that he was buried, and that he rose again the third day according to the scriptures.',
    yearWritten: '~750 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'Like Jonah — three days and three nights',
    otRef: 'Jonah 1:17',
    otText: 'Now the LORD had prepared a great fish to swallow up Jonah. And Jonah was in the belly of the fish three days and three nights.',
    ntRef: 'Matthew 12:40',
    ntText: 'For as Jonas was three days and three nights in the whale\'s belly; so shall the Son of man be three days and three nights in the heart of the earth.',
    yearWritten: '~760 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'He would triumph over death',
    otRef: 'Isaiah 25:8',
    otText: 'He will swallow up death in victory; and the Lord GOD will wipe away tears from off all faces...',
    ntRef: '1 Corinthians 15:54',
    ntText: '...then shall be brought to pass the saying that is written, Death is swallowed up in victory.',
    yearWritten: '~700 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'He would send the Holy Spirit',
    otRef: 'Joel 2:28',
    otText: 'And it shall come to pass afterward, that I will pour out my spirit upon all flesh...',
    ntRef: 'Acts 2:1-4',
    ntText: 'And when the day of Pentecost was fully come, they were all with one accord in one place... And they were all filled with the Holy Ghost...',
    yearWritten: '~800 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'He would lead captivity captive',
    otRef: 'Psalm 68:18',
    otText: 'Thou hast ascended on high, thou hast led captivity captive...',
    ntRef: 'Ephesians 4:8',
    ntText: 'Wherefore he saith, When he ascended up on high, he led captivity captive, and gave gifts unto men.',
    yearWritten: '~1000 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'Resurrection foretold by David',
    otRef: 'Psalm 16:9-10',
    otText: 'Therefore my heart is glad, and my glory rejoiceth: my flesh also shall rest in hope. For thou wilt not leave my soul in hell...',
    ntRef: 'Acts 2:25-31',
    ntText: 'For David speaketh concerning him... my flesh shall rest in hope: Because thou wilt not leave my soul in hell...',
    yearWritten: '~1000 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'He would give gifts to men',
    otRef: 'Psalm 68:18',
    otText: '...thou hast received gifts for men; yea, for the rebellious also, that the LORD God might dwell among them.',
    ntRef: 'Ephesians 4:8-11',
    ntText: '...he led captivity captive, and gave gifts unto men... And he gave some, apostles; and some, prophets; and some, evangelists...',
    yearWritten: '~1000 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'The firstfruits of the resurrection',
    otRef: 'Leviticus 23:10-11',
    otText: '...ye shall bring a sheaf of the firstfruits of your harvest unto the priest: And he shall wave the sheaf before the LORD...',
    ntRef: '1 Corinthians 15:20',
    ntText: 'But now is Christ risen from the dead, and become the firstfruits of them that slept.',
    yearWritten: '~1400 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'He would appear to many after resurrection',
    otRef: 'Isaiah 53:10',
    otText: '...he shall prolong his days, and the pleasure of the LORD shall prosper in his hand.',
    ntRef: '1 Corinthians 15:5-8',
    ntText: '...he was seen of Cephas, then of the twelve: After that, he was seen of above five hundred brethren at once...',
    yearWritten: '~700 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'Would be received up in glory',
    otRef: 'Psalm 24:7-10',
    otText: 'Lift up your heads, O ye gates... and the King of glory shall come in. Who is this King of glory? The LORD of hosts, he is the King of glory.',
    ntRef: '1 Timothy 3:16',
    ntText: '...God was manifest in the flesh, justified in the Spirit, seen of angels, preached unto the Gentiles, believed on in the world, received up into glory.',
    yearWritten: '~1000 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'Would be glorified',
    otRef: 'Isaiah 55:5',
    otText: '...nations that knew not thee shall run unto thee because of the LORD thy God, and for the Holy One of Israel; for he hath glorified thee.',
    ntRef: 'John 17:1',
    ntText: '...Father, the hour is come; glorify thy Son, that thy Son also may glorify thee.',
    yearWritten: '~700 BC',
    category: 'Resurrection & Ascension',
  },
  {
    prophecy: 'A cloud would receive Him',
    otRef: 'Daniel 7:13',
    otText: '...one like the Son of man came with the clouds of heaven, and came to the Ancient of days...',
    ntRef: 'Acts 1:9',
    ntText: '...he was taken up; and a cloud received him out of their sight.',
    yearWritten: '~530 BC',
    category: 'Resurrection & Ascension',
  },

  // ══════════════════════════════════════════════════════════════════
  //  PRIESTHOOD & KINGSHIP
  // ══════════════════════════════════════════════════════════════════
  {
    prophecy: 'A priest forever like Melchizedek',
    otRef: 'Psalm 110:4',
    otText: 'The LORD hath sworn, and will not repent, Thou art a priest for ever after the order of Melchizedek.',
    ntRef: 'Hebrews 5:5-6',
    ntText: '...Thou art a priest for ever after the order of Melchisedec.',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'King of kings',
    otRef: 'Daniel 7:13-14',
    otText: '...one like the Son of man came with the clouds of heaven... And there was given him dominion, and glory, and a kingdom, that all people, nations, and languages, should serve him.',
    ntRef: 'Revelation 19:16',
    ntText: 'And he hath on his vesture and on his thigh a name written, KING OF KINGS, AND LORD OF LORDS.',
    yearWritten: '~530 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'His throne established forever',
    otRef: '2 Samuel 7:12-13',
    otText: '...I will set up thy seed after thee... and I will stablish the throne of his kingdom for ever.',
    ntRef: 'Luke 1:32-33',
    ntText: '...the Lord God shall give unto him the throne of his father David: And he shall reign over the house of Jacob for ever; and of his kingdom there shall be no end.',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would be both priest and king',
    otRef: 'Zechariah 6:13',
    otText: 'Even he shall build the temple of the LORD; and he shall bear the glory, and shall sit and rule upon his throne; and he shall be a priest upon his throne...',
    ntRef: 'Hebrews 8:1',
    ntText: 'Now of the things which we have spoken this is the sum: We have such an high priest, who is set on the right hand of the throne of the Majesty in the heavens.',
    yearWritten: '~520 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would make intercession',
    otRef: 'Isaiah 53:12',
    otText: '...and made intercession for the transgressors.',
    ntRef: 'Hebrews 7:25',
    ntText: 'Wherefore he is able also to save them to the uttermost that come unto God by him, seeing he ever liveth to make intercession for them.',
    yearWritten: '~700 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'A new covenant mediator',
    otRef: 'Jeremiah 31:31-33',
    otText: '...I will make a new covenant with the house of Israel... I will put my law in their inward parts, and write it in their hearts...',
    ntRef: 'Hebrews 9:15',
    ntText: 'And for this cause he is the mediator of the new testament...',
    yearWritten: '~600 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would rule the nations',
    otRef: 'Psalm 2:8-9',
    otText: 'Ask of me, and I shall give thee the heathen for thine inheritance, and the uttermost parts of the earth for thy possession. Thou shalt break them with a rod of iron...',
    ntRef: 'Revelation 2:26-27',
    ntText: '...to him will I give power over the nations: And he shall rule them with a rod of iron...',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'A sceptre would rise out of Israel',
    otRef: 'Numbers 24:17',
    otText: '...a Sceptre shall rise out of Israel...',
    ntRef: 'Revelation 19:15',
    ntText: 'And out of his mouth goeth a sharp sword, that with it he should smite the nations: and he shall rule them with a rod of iron...',
    yearWritten: '~1400 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'High priest who can sympathize',
    otRef: 'Isaiah 53:3',
    otText: '...a man of sorrows, and acquainted with grief...',
    ntRef: 'Hebrews 4:15',
    ntText: 'For we have not an high priest which cannot be touched with the feeling of our infirmities; but was in all points tempted like as we are, yet without sin.',
    yearWritten: '~700 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would judge the world',
    otRef: 'Psalm 96:13',
    otText: '...for he cometh to judge the earth: he shall judge the world with righteousness, and the people with his truth.',
    ntRef: 'Acts 17:31',
    ntText: 'Because he hath appointed a day, in the which he will judge the world in righteousness by that man whom he hath ordained...',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would judge among the nations',
    otRef: 'Isaiah 2:4',
    otText: 'And he shall judge among the nations, and shall rebuke many people...',
    ntRef: 'John 5:22',
    ntText: 'For the Father judgeth no man, but hath committed all judgment unto the Son.',
    yearWritten: '~700 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'The key of David given to Him',
    otRef: 'Isaiah 22:22',
    otText: 'And the key of the house of David will I lay upon his shoulder; so he shall open, and none shall shut; and he shall shut, and none shall open.',
    ntRef: 'Revelation 3:7',
    ntText: '...he that hath the key of David, he that openeth, and no man shutteth; and shutteth, and no man openeth.',
    yearWritten: '~700 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would be the mediator between God and man',
    otRef: 'Job 9:33',
    otText: 'Neither is there any daysman betwixt us, that might lay his hand upon us both.',
    ntRef: '1 Timothy 2:5',
    ntText: 'For there is one God, and one mediator between God and men, the man Christ Jesus.',
    yearWritten: '~1400 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'His authority over all things',
    otRef: 'Psalm 8:6',
    otText: 'Thou madest him to have dominion over the works of thy hands; thou hast put all things under his feet.',
    ntRef: 'Hebrews 2:8',
    ntText: 'Thou hast put all things in subjection under his feet. For in that he put all in subjection under him, he left nothing that is not put under him.',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'His kingdom would include Gentiles',
    otRef: 'Isaiah 42:1',
    otText: '...he shall bring forth judgment to the Gentiles.',
    ntRef: 'Ephesians 2:13-14',
    ntText: 'But now in Christ Jesus ye who sometimes were far off are made nigh by the blood of Christ. For he is our peace, who hath made both one...',
    yearWritten: '~700 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would build the temple of the Lord',
    otRef: 'Zechariah 6:12-13',
    otText: '...Behold the man whose name is The BRANCH... he shall build the temple of the LORD.',
    ntRef: 'Ephesians 2:19-21',
    ntText: '...Jesus Christ himself being the chief corner stone; In whom all the building fitly framed together groweth unto an holy temple in the Lord.',
    yearWritten: '~520 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would offer a better sacrifice',
    otRef: 'Psalm 40:6-8',
    otText: 'Sacrifice and offering thou didst not desire; mine ears hast thou opened... Lo, I come: in the volume of the book it is written of me, I delight to do thy will, O my God...',
    ntRef: 'Hebrews 10:5-10',
    ntText: '...Sacrifice and offering thou wouldest not, but a body hast thou prepared me... Lo, I come... to do thy will, O God.',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would be the Lord of all',
    otRef: 'Psalm 110:1',
    otText: 'The LORD said unto my Lord, Sit thou at my right hand...',
    ntRef: 'Acts 2:36',
    ntText: 'Therefore let all the house of Israel know assuredly, that God hath made that same Jesus, whom ye have crucified, both Lord and Christ.',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would be worshipped by angels',
    otRef: 'Psalm 97:7',
    otText: '...worship him, all ye gods.',
    ntRef: 'Hebrews 1:6',
    ntText: 'And again, when he bringeth in the firstbegotten into the world, he saith, And let all the angels of God worship him.',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would be given all authority',
    otRef: 'Daniel 7:14',
    otText: 'And there was given him dominion, and glory, and a kingdom, that all people, nations, and languages, should serve him...',
    ntRef: 'Matthew 28:18',
    ntText: 'And Jesus came and spake unto them, saying, All power is given unto me in heaven and in earth.',
    yearWritten: '~530 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'His priesthood is permanent',
    otRef: 'Psalm 110:4',
    otText: 'The LORD hath sworn, and will not repent, Thou art a priest for ever...',
    ntRef: 'Hebrews 7:24',
    ntText: 'But this man, because he continueth ever, hath an unchangeable priesthood.',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would be called Lord by David',
    otRef: 'Psalm 110:1',
    otText: 'The LORD said unto my Lord...',
    ntRef: 'Matthew 22:43-45',
    ntText: '...How then doth David in spirit call him Lord...? If David then call him Lord, how is he his son?',
    yearWritten: '~1000 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'Every knee would bow to Him',
    otRef: 'Isaiah 45:23',
    otText: 'I have sworn by myself, the word is gone out of my mouth in righteousness... That unto me every knee shall bow, every tongue shall swear.',
    ntRef: 'Philippians 2:10-11',
    ntText: 'That at the name of Jesus every knee should bow... And that every tongue should confess that Jesus Christ is Lord, to the glory of God the Father.',
    yearWritten: '~700 BC',
    category: 'Priesthood & Kingship',
  },
  {
    prophecy: 'He would establish an everlasting covenant',
    otRef: 'Isaiah 55:3',
    otText: 'Incline your ear, and come unto me: hear, and your soul shall live; and I will make an everlasting covenant with you...',
    ntRef: 'Hebrews 13:20',
    ntText: '...the God of peace, that brought again from the dead our Lord Jesus, that great shepherd of the sheep, through the blood of the everlasting covenant.',
    yearWritten: '~700 BC',
    category: 'Priesthood & Kingship',
  },

  // ══════════════════════════════════════════════════════════════════
  //  SECOND COMING & REIGN
  // ══════════════════════════════════════════════════════════════════
  {
    prophecy: 'He would come again',
    otRef: 'Zechariah 14:4',
    otText: 'And his feet shall stand in that day upon the mount of Olives, which is before Jerusalem on the east...',
    ntRef: 'Acts 1:11',
    ntText: '...this same Jesus, which is taken up from you into heaven, shall so come in like manner as ye have seen him go into heaven.',
    yearWritten: '~520 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would come in the clouds',
    otRef: 'Daniel 7:13',
    otText: '...one like the Son of man came with the clouds of heaven, and came to the Ancient of days...',
    ntRef: 'Revelation 1:7',
    ntText: 'Behold, he cometh with clouds; and every eye shall see him, and they also which pierced him: and all kindreds of the earth shall wail because of him.',
    yearWritten: '~530 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would reign over the earth',
    otRef: 'Zechariah 14:9',
    otText: 'And the LORD shall be king over all the earth: in that day shall there be one LORD, and his name one.',
    ntRef: 'Revelation 11:15',
    ntText: '...The kingdoms of this world are become the kingdoms of our Lord, and of his Christ; and he shall reign for ever and ever.',
    yearWritten: '~520 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'Every eye would see Him',
    otRef: 'Zechariah 12:10',
    otText: '...they shall look upon me whom they have pierced...',
    ntRef: 'Revelation 1:7',
    ntText: '...every eye shall see him, and they also which pierced him...',
    yearWritten: '~520 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'An everlasting kingdom',
    otRef: 'Daniel 2:44',
    otText: 'And in the days of these kings shall the God of heaven set up a kingdom, which shall never be destroyed...',
    ntRef: 'Luke 1:33',
    ntText: 'And he shall reign over the house of Jacob for ever; and of his kingdom there shall be no end.',
    yearWritten: '~530 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would judge the living and the dead',
    otRef: 'Psalm 50:3-6',
    otText: 'Our God shall come, and shall not keep silence... He shall call to the heavens from above, and to the earth, that he may judge his people.',
    ntRef: '2 Timothy 4:1',
    ntText: '...the Lord Jesus Christ, who shall judge the quick and the dead at his appearing and his kingdom.',
    yearWritten: '~1000 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would make all things new',
    otRef: 'Isaiah 65:17',
    otText: 'For, behold, I create new heavens and a new earth: and the former shall not be remembered, nor come into mind.',
    ntRef: 'Revelation 21:5',
    ntText: 'And he that sat upon the throne said, Behold, I make all things new.',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'Peace and no more war',
    otRef: 'Isaiah 2:4',
    otText: '...they shall beat their swords into plowshares, and their spears into pruninghooks: nation shall not lift up sword against nation, neither shall they learn war any more.',
    ntRef: 'Revelation 21:4',
    ntText: 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying...',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would come with His saints',
    otRef: 'Zechariah 14:5',
    otText: '...and the LORD my God shall come, and all the saints with thee.',
    ntRef: '1 Thessalonians 3:13',
    ntText: '...at the coming of our Lord Jesus Christ with all his saints.',
    yearWritten: '~520 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would destroy death forever',
    otRef: 'Isaiah 25:8',
    otText: 'He will swallow up death in victory; and the Lord GOD will wipe away tears from off all faces...',
    ntRef: 'Revelation 21:4',
    ntText: '...there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'His reign would be righteous',
    otRef: 'Isaiah 32:1',
    otText: 'Behold, a king shall reign in righteousness, and princes shall rule in judgment.',
    ntRef: 'Revelation 19:11',
    ntText: '...and he that sat upon him was called Faithful and True, and in righteousness he doth judge and make war.',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'The wolf and lamb would dwell together',
    otRef: 'Isaiah 11:6',
    otText: 'The wolf also shall dwell with the lamb, and the leopard shall lie down with the kid; and the calf and the young lion and the fatling together...',
    ntRef: 'Revelation 21:1-5',
    ntText: 'And I saw a new heaven and a new earth... And he that sat upon the throne said, Behold, I make all things new.',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'The knowledge of the Lord shall fill the earth',
    otRef: 'Isaiah 11:9',
    otText: '...for the earth shall be full of the knowledge of the LORD, as the waters cover the sea.',
    ntRef: 'Habakkuk 2:14',
    ntText: 'For the earth shall be filled with the knowledge of the glory of the LORD, as the waters cover the sea.',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would return to the Mount of Olives',
    otRef: 'Zechariah 14:4',
    otText: 'And his feet shall stand in that day upon the mount of Olives...',
    ntRef: 'Acts 1:11-12',
    ntText: '...shall so come in like manner as ye have seen him go into heaven. Then returned they unto Jerusalem from the mount called Olivet...',
    yearWritten: '~520 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'Satan would be crushed',
    otRef: 'Genesis 3:15',
    otText: '...it shall bruise thy head, and thou shalt bruise his heel.',
    ntRef: 'Romans 16:20',
    ntText: 'And the God of peace shall bruise Satan under your feet shortly.',
    yearWritten: '~1400 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would reign from Zion',
    otRef: 'Psalm 2:6',
    otText: 'Yet have I set my king upon my holy hill of Zion.',
    ntRef: 'Hebrews 12:22',
    ntText: 'But ye are come unto mount Sion, and unto the city of the living God, the heavenly Jerusalem...',
    yearWritten: '~1000 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would receive an eternal dominion',
    otRef: 'Daniel 7:14',
    otText: '...his dominion is an everlasting dominion, which shall not pass away, and his kingdom that which shall not be destroyed.',
    ntRef: 'Revelation 11:15',
    ntText: '...and he shall reign for ever and ever.',
    yearWritten: '~530 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'The dead in Christ would rise',
    otRef: 'Daniel 12:2',
    otText: 'And many of them that sleep in the dust of the earth shall awake, some to everlasting life, and some to shame and everlasting contempt.',
    ntRef: '1 Thessalonians 4:16',
    ntText: '...and the dead in Christ shall rise first.',
    yearWritten: '~530 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'All nations would worship Him',
    otRef: 'Psalm 72:11',
    otText: 'Yea, all kings shall fall down before him: all nations shall serve him.',
    ntRef: 'Revelation 15:4',
    ntText: 'Who shall not fear thee, O Lord, and glorify thy name?... for all nations shall come and worship before thee...',
    yearWritten: '~1000 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'A new heaven and a new earth',
    otRef: 'Isaiah 66:22',
    otText: 'For as the new heavens and the new earth, which I will make, shall remain before me, saith the LORD, so shall your seed and your name remain.',
    ntRef: 'Revelation 21:1',
    ntText: 'And I saw a new heaven and a new earth: for the first heaven and the first earth were passed away; and there was no more sea.',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'God would dwell with His people',
    otRef: 'Ezekiel 37:27',
    otText: 'My tabernacle also shall be with them: yea, I will be their God, and they shall be my people.',
    ntRef: 'Revelation 21:3',
    ntText: '...Behold, the tabernacle of God is with men, and he will dwell with them, and they shall be his people, and God himself shall be with them, and be their God.',
    yearWritten: '~590 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'No more tears or sorrow',
    otRef: 'Isaiah 25:8',
    otText: '...and the Lord GOD will wipe away tears from off all faces...',
    ntRef: 'Revelation 21:4',
    ntText: 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying...',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would come as a thief in the night',
    otRef: 'Malachi 3:1-2',
    otText: '...the Lord, whom ye seek, shall suddenly come to his temple... But who may abide the day of his coming?',
    ntRef: '1 Thessalonians 5:2',
    ntText: 'For yourselves know perfectly that the day of the Lord so cometh as a thief in the night.',
    yearWritten: '~430 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would separate the righteous from the wicked',
    otRef: 'Malachi 3:18',
    otText: 'Then shall ye return, and discern between the righteous and the wicked, between him that serveth God and him that serveth him not.',
    ntRef: 'Matthew 25:31-33',
    ntText: '...he shall set the sheep on his right hand, but the goats on the left.',
    yearWritten: '~430 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'The sun of righteousness would arise',
    otRef: 'Malachi 4:2',
    otText: 'But unto you that fear my name shall the Sun of righteousness arise with healing in his wings...',
    ntRef: 'Luke 1:78',
    ntText: 'Through the tender mercy of our God; whereby the dayspring from on high hath visited us.',
    yearWritten: '~430 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'His enemies would be His footstool',
    otRef: 'Psalm 110:1',
    otText: '...Sit thou at my right hand, until I make thine enemies thy footstool.',
    ntRef: 'Hebrews 10:12-13',
    ntText: 'But this man, after he had offered one sacrifice for sins for ever, sat down on the right hand of God; From henceforth expecting till his enemies be made his footstool.',
    yearWritten: '~1000 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would rule all nations with a rod of iron',
    otRef: 'Psalm 2:9',
    otText: 'Thou shalt break them with a rod of iron; thou shalt dash them in pieces like a potter\'s vessel.',
    ntRef: 'Revelation 12:5',
    ntText: 'And she brought forth a man child, who was to rule all nations with a rod of iron...',
    yearWritten: '~1000 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'Israel would be regathered',
    otRef: 'Isaiah 11:11-12',
    otText: '...the Lord shall set his hand again the second time to recover the remnant of his people... and shall assemble the outcasts of Israel...',
    ntRef: 'Matthew 24:31',
    ntText: 'And he shall send his angels with a great sound of a trumpet, and they shall gather together his elect from the four winds...',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'The trumpet would sound',
    otRef: 'Isaiah 27:13',
    otText: '...the great trumpet shall be blown, and they shall come which were ready to perish...',
    ntRef: '1 Thessalonians 4:16',
    ntText: 'For the Lord himself shall descend from heaven with a shout, with the voice of the archangel, and with the trump of God...',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'He would bring a final judgment',
    otRef: 'Joel 3:12-14',
    otText: '...for there will I sit to judge all the heathen round about. Multitudes, multitudes in the valley of decision...',
    ntRef: 'Revelation 20:11-12',
    ntText: 'And I saw a great white throne... And I saw the dead, small and great, stand before God; and the books were opened...',
    yearWritten: '~800 BC',
    category: 'Second Coming & Reign',
  },
  {
    prophecy: 'His kingdom would have no end',
    otRef: 'Isaiah 9:7',
    otText: 'Of the increase of his government and peace there shall be no end...',
    ntRef: 'Luke 1:33',
    ntText: '...and of his kingdom there shall be no end.',
    yearWritten: '~700 BC',
    category: 'Second Coming & Reign',
  },
];

/* ------------------------------------------------------------------ */
/*  Ref parsing helper                                                 */
/* ------------------------------------------------------------------ */

function parseRef(ref: string): { book: BookDef; chapter: number } | null {
  // e.g. "Isaiah 7:14", "1 Peter 2:24", "2 Samuel 7:12-13"
  const match = ref.match(/^(.+?)\s+(\d+):\d/);
  if (!match) return null;
  const bookName = match[1];
  const chapter = parseInt(match[2], 10);
  const book = BOOKS.find(
    b => b.name.toLowerCase() === bookName.toLowerCase()
      || b.name.toLowerCase().replace(/\s+/g, '') === bookName.toLowerCase().replace(/\s+/g, ''),
  );
  if (!book) return null;
  return { book, chapter };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProphecyTimeline({ accentColor, onNavigateToRead }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>(CATEGORIES[0]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const { cream } = T;

  const filtered = PROPHECIES.filter(p => p.category === activeCategory);

  const handleRefTap = useCallback((ref: string) => {
    const parsed = parseRef(ref);
    if (parsed) onNavigateToRead(parsed.book, parsed.chapter);
  }, [onNavigateToRead]);

  const totalCount = PROPHECIES.length;

  const categoryCount = (cat: Category) => PROPHECIES.filter(p => p.category === cat).length;

  /* ---- ref link style ---- */
  const refLinkStyle = (color: string): React.CSSProperties => ({
    color,
    fontWeight: 600,
    fontSize: 11,
    textDecoration: 'underline',
    textDecorationStyle: 'dotted' as const,
    textUnderlineOffset: 2,
    cursor: 'pointer',
    letterSpacing: 0.3,
  });

  return (
    <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: cream, marginBottom: 4 }}>
          Prophecy Fulfilled
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
          Old Testament predictions, New Testament fulfillment
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 12,
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginBottom: 24,
      }}>
        <div style={{
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}30`,
          borderRadius: 12,
          padding: '10px 18px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: accentColor }}>{totalCount}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Prophecies fulfilled by one person
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '10px 18px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: cream }}>10<sup style={{ fontSize: 13 }}>17</sup></div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Odds against just 8 fulfilled
          </div>
        </div>
      </div>

      {/* ── Category Tabs ──────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 20,
        justifyContent: 'center',
      }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat;
          const count = categoryCount(cat);
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setExpandedIdx(null); }}
              style={{
                padding: '7px 13px',
                borderRadius: 20,
                border: `1px solid ${isActive ? accentColor : 'rgba(255,255,255,0.1)'}`,
                background: isActive ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
                color: isActive ? accentColor : 'rgba(255,255,255,0.5)',
                fontSize: 11,
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 12 }}>{CATEGORY_ICONS[cat]}</span>
              <span>{cat}</span>
              <span style={{
                fontSize: 9,
                opacity: 0.6,
                background: isActive ? `${accentColor}25` : 'rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '1px 5px',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 2×2 Tile Grid ──────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}>
        {filtered.map((p) => {
          const globalIdx = PROPHECIES.indexOf(p);
          const isExpanded = expandedIdx === globalIdx;

          return (
            <div
              key={globalIdx}
              onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
              style={{
                gridColumn: isExpanded ? '1 / -1' : 'auto',
                borderRadius: 14,
                border: `1px solid ${isExpanded ? `${accentColor}45` : 'rgba(255,255,255,0.07)'}`,
                background: isExpanded
                  ? `linear-gradient(135deg, ${accentColor}0d, rgba(255,255,255,0.03))`
                  : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'all 0.22s ease',
                overflow: 'hidden',
              }}
            >

              {/* Tile — compact view */}
              <div style={{ padding: '12px 13px' }}>
                {/* Icon + year badge row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[p.category]}</span>
                  <span style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '2px 7px',
                    borderRadius: 8,
                    fontWeight: 500,
                  }}>{p.yearWritten}</span>
                </div>

                {/* Prophecy title */}
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: cream,
                  lineHeight: 1.35,
                  marginBottom: 8,
                }}>
                  {p.prophecy}
                </div>

                {/* OT → NT refs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span
                    onClick={(e) => { e.stopPropagation(); handleRefTap(p.otRef); }}
                    style={refLinkStyle('rgba(255,255,255,0.4)')}
                  >
                    {p.otRef}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 12, height: 1, background: `${accentColor}50` }} />
                    <span
                      onClick={(e) => { e.stopPropagation(); handleRefTap(p.ntRef); }}
                      style={refLinkStyle(accentColor)}
                    >
                      {p.ntRef}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded detail — full width when open */}
              {isExpanded && (
                <div style={{ padding: '0 13px 13px', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
                  {/* OT panel */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                    padding: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: 8,
                  }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.1, color: 'rgba(255,255,255,0.3)', marginBottom: 5, fontWeight: 600 }}>Prophecy</div>
                    <div
                      onClick={(e) => { e.stopPropagation(); handleRefTap(p.otRef); }}
                      style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}
                    >{p.otRef}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.65, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>&ldquo;{p.otText}&rdquo;</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', marginTop: 6 }}>Written {p.yearWritten}</div>
                  </div>
                  {/* Connector */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 1, background: `${accentColor}25` }} />
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${accentColor}18`, border: `1px solid ${accentColor}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: accentColor, fontWeight: 700 }}>✓</div>
                    <div style={{ flex: 1, height: 1, background: `${accentColor}25` }} />
                  </div>
                  {/* NT panel */}
                  <div style={{
                    background: `${accentColor}08`,
                    borderRadius: 10,
                    padding: 12,
                    border: `1px solid ${accentColor}18`,
                  }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.1, color: `${accentColor}88`, marginBottom: 5, fontWeight: 600 }}>Fulfilled</div>
                    <div
                      onClick={(e) => { e.stopPropagation(); handleRefTap(p.ntRef); }}
                      style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 6, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}
                    >{p.ntRef}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.65, color: 'rgba(255,255,255,0.7)' }}>&ldquo;{p.ntText}&rdquo;</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom note ────────────────────────────────────────── */}
      <div style={{
        textAlign: 'center',
        marginTop: 32,
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.7,
        }}>
          Written over a span of <strong style={{ color: cream }}>1,500 years</strong> by{' '}
          <strong style={{ color: cream }}>40+ authors</strong>, these prophecies were
          fulfilled in the life of <strong style={{ color: accentColor }}>one person</strong> &mdash;
          Jesus of Nazareth.
        </div>
      </div>

      {/* ── Global CSS for animation ───────────────────────────── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
