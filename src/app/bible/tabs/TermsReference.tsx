'use client';

import { useState } from 'react';
import { cleanMarkdown } from '../types';
import WordStudy from './WordStudy';

interface Props {
  accentColor: string;
  selectedBibleAbbr?: string;
  hideReligions?: boolean;
  religionsOnly?: boolean;
}

// ── Biblical Terms & Definitions ─────────────────────────────────────────────

interface Term {
  term: string;
  definition: string;
  greek?: string;
  hebrew?: string;
  keyVerse: string;
  category: string;
}

const TERMS: Term[] = [
  // Salvation & Redemption
  { term: 'Gospel', definition: 'The "good news" that God sent His Son Jesus to die for our sins and rise again, offering eternal life to all who believe.', greek: 'euangelion', keyVerse: 'Romans 1:16', category: 'Salvation' },
  { term: 'Grace', definition: 'Unmerited favor from God. The free gift of salvation that cannot be earned through works or good deeds.', greek: 'charis', keyVerse: 'Ephesians 2:8-9', category: 'Salvation' },
  { term: 'Salvation', definition: 'Deliverance from sin and its consequences. Being saved from spiritual death through faith in Jesus Christ.', greek: 'soteria', keyVerse: 'Acts 4:12', category: 'Salvation' },
  { term: 'Redemption', definition: 'The act of being bought back or set free. Christ paid the price for our freedom from sin with His blood.', greek: 'apolutrosis', keyVerse: 'Ephesians 1:7', category: 'Salvation' },
  { term: 'Justification', definition: 'Being declared righteous before God. Not because of our own merit, but because of Christ\'s sacrifice applied to us through faith.', greek: 'dikaiosis', keyVerse: 'Romans 5:1', category: 'Salvation' },
  { term: 'Atonement', definition: 'The reconciliation of God and humanity through the sacrificial death of Jesus. He took the punishment we deserved.', hebrew: 'kaphar', keyVerse: 'Romans 3:25', category: 'Salvation' },
  { term: 'Propitiation', definition: 'The satisfaction of God\'s righteous wrath against sin. Jesus absorbed the penalty so we could go free.', greek: 'hilasmos', keyVerse: '1 John 2:2', category: 'Salvation' },
  { term: 'Born Again', definition: 'Spiritual rebirth. When a person places faith in Christ, they receive new spiritual life — a transformation from the inside out.', greek: 'gennao anothen', keyVerse: 'John 3:3', category: 'Salvation' },
  { term: 'Repentance', definition: 'A sincere turning away from sin and turning toward God. Not just feeling sorry, but a genuine change of heart and direction.', greek: 'metanoia', keyVerse: 'Acts 3:19', category: 'Salvation' },

  // God & Theology
  { term: 'Trinity', definition: 'One God existing in three persons: Father, Son, and Holy Spirit. Not three gods, but one God in three distinct persons.', keyVerse: 'Matthew 28:19', category: 'God' },
  { term: 'Omniscient', definition: 'All-knowing. God has complete knowledge of everything — past, present, and future.', keyVerse: 'Psalm 139:1-4', category: 'God' },
  { term: 'Omnipresent', definition: 'Present everywhere at all times. There is no place where God is not.', keyVerse: 'Psalm 139:7-10', category: 'God' },
  { term: 'Omnipotent', definition: 'All-powerful. Nothing is impossible for God. He has unlimited authority and strength.', keyVerse: 'Jeremiah 32:17', category: 'God' },
  { term: 'Sovereignty', definition: 'God\'s supreme authority and control over all creation. He rules over everything with wisdom and purpose.', keyVerse: 'Daniel 4:35', category: 'God' },
  { term: 'Providence', definition: 'God\'s ongoing care and guidance of His creation. He sustains, governs, and directs all things toward His purposes.', keyVerse: 'Romans 8:28', category: 'God' },
  { term: 'Holiness', definition: 'God\'s absolute moral perfection and separation from sin. Also the calling for believers to be set apart for God\'s purposes.', hebrew: 'qadosh', keyVerse: 'Isaiah 6:3', category: 'God' },

  // Church & Practice
  { term: 'Baptism', definition: 'An outward declaration of an inward transformation. Immersion in water symbolizes dying to sin and rising to new life in Christ.', greek: 'baptizo', keyVerse: 'Romans 6:3-4', category: 'Church' },
  { term: 'Communion', definition: 'Also called the Lord\'s Supper or Eucharist. Bread and wine/juice representing Christ\'s body and blood, taken in remembrance of His sacrifice.', greek: 'koinonia', keyVerse: '1 Corinthians 11:23-26', category: 'Church' },
  { term: 'Fellowship', definition: 'Shared life among believers. Deep, authentic community rooted in a common faith and mutual encouragement.', greek: 'koinonia', keyVerse: 'Acts 2:42', category: 'Church' },
  { term: 'Discipleship', definition: 'The process of following Jesus and becoming more like Him. Learning, growing, and teaching others to do the same.', greek: 'mathetes', keyVerse: 'Matthew 28:19-20', category: 'Church' },
  { term: 'Tithe', definition: 'Giving a tenth of one\'s income to God. A practice of worship, trust, and generosity rooted in the Old Testament.', hebrew: 'maaser', keyVerse: 'Malachi 3:10', category: 'Church' },

  // Spiritual Life
  { term: 'Sanctification', definition: 'The ongoing process of being made holy. After salvation, the Holy Spirit works in believers to transform them into Christ\'s likeness.', greek: 'hagiasmos', keyVerse: '1 Thessalonians 4:3', category: 'Growth' },
  { term: 'Fruit of the Spirit', definition: 'The character qualities produced in a believer\'s life by the Holy Spirit: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.', keyVerse: 'Galatians 5:22-23', category: 'Growth' },
  { term: 'Spiritual Gifts', definition: 'Special abilities given by the Holy Spirit to believers for the building up of the church and the glory of God.', greek: 'charismata', keyVerse: '1 Corinthians 12:4-11', category: 'Growth' },
  { term: 'Armor of God', definition: 'A metaphor for the spiritual resources God provides believers to stand against evil: truth, righteousness, peace, faith, salvation, the Word, and prayer.', keyVerse: 'Ephesians 6:10-18', category: 'Growth' },
  { term: 'Intercession', definition: 'Praying on behalf of others. Standing in the gap between someone and God, asking for His intervention in their lives.', greek: 'enteuxis', keyVerse: '1 Timothy 2:1', category: 'Growth' },

  // Scripture & Prophecy
  { term: 'Covenant', definition: 'A binding agreement between God and His people. The Old Covenant was through the Law; the New Covenant is through Christ\'s blood.', hebrew: 'berith', keyVerse: 'Hebrews 8:6', category: 'Scripture' },
  { term: 'Prophecy', definition: 'A message from God, often about future events. Fulfilled prophecy is one of the strongest evidences for the truth of Scripture.', hebrew: 'naba', keyVerse: '2 Peter 1:21', category: 'Scripture' },
  { term: 'Parable', definition: 'A short story Jesus told using everyday situations to teach spiritual truths. Simple on the surface, profound underneath.', greek: 'parabole', keyVerse: 'Matthew 13:34', category: 'Scripture' },
  { term: 'Canon', definition: 'The recognized collection of books accepted as authentic Scripture. 66 books: 39 Old Testament, 27 New Testament.', greek: 'kanon', keyVerse: '2 Timothy 3:16', category: 'Scripture' },
  { term: 'Inspiration', definition: 'The belief that Scripture is "God-breathed." Human authors wrote under the guidance of the Holy Spirit, making the Bible authoritative and trustworthy.', greek: 'theopneustos', keyVerse: '2 Timothy 3:16', category: 'Scripture' },

  // End Times
  { term: 'Rapture', definition: 'The belief that Christ will gather believers to Himself, both living and dead, before or during the end times tribulation.', greek: 'harpazo', keyVerse: '1 Thessalonians 4:16-17', category: 'End Times' },
  { term: 'Second Coming', definition: 'The future return of Jesus Christ to earth in power and glory to judge the living and the dead and establish His eternal kingdom.', greek: 'parousia', keyVerse: 'Revelation 1:7', category: 'End Times' },
  { term: 'Tribulation', definition: 'A future period of intense suffering and divine judgment on the earth. Described primarily in Daniel and Revelation.', keyVerse: 'Matthew 24:21', category: 'End Times' },
  { term: 'Millennium', definition: 'The thousand-year reign of Christ on earth described in Revelation 20. Christians differ on whether it is literal or symbolic.', keyVerse: 'Revelation 20:4-6', category: 'End Times' },

  // Denominations & Traditions
  { term: 'Protestant', definition: 'Christians who "protested" against the Catholic Church during the Reformation (1517). Believe in Scripture alone (sola scriptura), faith alone (sola fide), and grace alone (sola gratia). Includes Baptists, Methodists, Lutherans, Pentecostals, and many more.', keyVerse: 'Romans 1:17', category: 'Denominations' },
  { term: 'Catholic', definition: 'The Roman Catholic Church — the largest Christian denomination with over 1 billion members. Led by the Pope in Rome. Holds to Sacred Scripture AND Sacred Tradition. Includes seven sacraments, veneration of Mary and saints, and apostolic succession from Peter.', keyVerse: 'Matthew 16:18', category: 'Denominations' },
  { term: 'Orthodox', definition: 'Eastern Orthodox Christianity — split from Rome in 1054 AD (the Great Schism). Includes Greek Orthodox, Russian Orthodox, and others. Rich in liturgy, icons, and ancient traditions. No Pope — governed by patriarchs and councils.', keyVerse: 'John 17:21', category: 'Denominations' },
  { term: 'Baptist', definition: 'Protestants who emphasize believer\'s baptism (not infant baptism), local church autonomy, and the authority of Scripture. One of the largest Protestant groups worldwide.', keyVerse: 'Acts 2:41', category: 'Denominations' },
  { term: 'Pentecostal', definition: 'Christians who emphasize the gifts of the Holy Spirit — speaking in tongues, prophecy, healing, and miracles. Trace their movement to the Azusa Street Revival of 1906.', keyVerse: 'Acts 2:4', category: 'Denominations' },
  { term: 'Methodist', definition: 'Founded by John Wesley in the 18th century. Emphasizes personal holiness, social justice, and methodical spiritual discipline. Known for hymn singing and circuit-riding preachers.', keyVerse: 'James 2:17', category: 'Denominations' },
  { term: 'Lutheran', definition: 'Founded during the Reformation by Martin Luther (1517). Emphasizes justification by faith alone and the authority of Scripture. The original Protestant denomination.', keyVerse: 'Romans 3:28', category: 'Denominations' },
  { term: 'Presbyterian', definition: 'Reformed tradition governed by elders (presbyters). Founded on the theology of John Calvin. Emphasizes God\'s sovereignty, predestination, and covenant theology.', keyVerse: 'Ephesians 1:4-5', category: 'Denominations' },
  { term: 'Non-Denominational', definition: 'Churches that are not formally aligned with any denomination. Often emphasize Scripture alone, contemporary worship, and relational community. The fastest-growing segment of Christianity.', keyVerse: '1 Corinthians 1:10', category: 'Denominations' },
  { term: 'Mormon (LDS)', definition: 'The Church of Jesus Christ of Latter-day Saints. Founded by Joseph Smith in 1830. Believes in the Book of Mormon as additional scripture alongside the Bible. Mainstream Christianity considers LDS theology significantly different from historic Christian orthodoxy.', keyVerse: 'Galatians 1:8', category: 'Denominations' },
  { term: 'Jehovah\'s Witness', definition: 'Founded in the 1870s. Rejects the Trinity, the deity of Christ, and the existence of hell. Uses the New World Translation of the Bible. Goes door-to-door evangelizing. Not considered orthodox Christianity by most theologians.', keyVerse: 'John 1:1', category: 'Denominations' },
  { term: 'Seventh-day Adventist', definition: 'Protestants who worship on Saturday (the seventh day) and emphasize the soon return of Christ. Founded in the 1860s. Known for health-conscious lifestyle and global missions.', keyVerse: 'Exodus 20:8', category: 'Denominations' },
  { term: 'Anglican / Episcopal', definition: 'The Church of England, established when Henry VIII broke from Rome in 1534. Episcopal is the American branch. Blends Catholic liturgy with Protestant theology. Known for the Book of Common Prayer.', keyVerse: 'Ephesians 4:5', category: 'Denominations' },

  // Biblical Titles & Symbols
  { term: 'Lion of Judah', definition: 'A title for Jesus Christ, referencing the tribe of Judah from which He descended. Symbolizes His kingship, power, and authority. In Revelation, the Lion who is also the Lamb.', keyVerse: 'Revelation 5:5', category: 'Titles' },
  { term: 'Lamb of God', definition: 'Jesus as the ultimate sacrifice — the Lamb whose blood takes away the sin of the world. Connects to the Passover lamb of Exodus and the sacrificial system of Leviticus.', hebrew: 'seh haElohim', keyVerse: 'John 1:29', category: 'Titles' },
  { term: 'Alpha and Omega', definition: 'First and last letters of the Greek alphabet. Jesus declares Himself the beginning and the end — eternal, complete, all-encompassing. He existed before creation and will reign forever.', greek: 'Alpha kai Omega', keyVerse: 'Revelation 22:13', category: 'Titles' },
  { term: 'Emmanuel / Immanuel', definition: '"God with us." The prophetic name given to the Messiah by Isaiah. Fulfilled in Jesus — God Himself taking on human flesh to dwell among His people.', hebrew: 'Immanu El', keyVerse: 'Isaiah 7:14', category: 'Titles' },
  { term: 'Messiah / Christ', definition: '"Anointed One." Messiah is Hebrew, Christ is Greek — both mean the same thing. The long-awaited King who would save Israel and the world. Jesus is the Messiah.', hebrew: 'Mashiach', greek: 'Christos', keyVerse: 'John 4:25-26', category: 'Titles' },
  { term: 'Son of Man', definition: 'Jesus\' favorite title for Himself — used over 80 times in the Gospels. Connects to Daniel 7:13 where "one like a son of man" receives eternal dominion from God. Emphasizes both His humanity and His divine authority.', keyVerse: 'Daniel 7:13-14', category: 'Titles' },
  { term: 'Son of God', definition: 'Declares Jesus\' unique divine nature — not created, but eternally begotten of the Father. The second person of the Trinity. Fully God and fully man.', keyVerse: 'John 3:16', category: 'Titles' },
  { term: 'Prince of Peace', definition: 'A prophetic title from Isaiah for the coming Messiah. Jesus brings peace between God and humanity, and peace that transcends all understanding.', hebrew: 'Sar Shalom', keyVerse: 'Isaiah 9:6', category: 'Titles' },
  { term: 'The Word (Logos)', definition: 'In the beginning was the Word, and the Word was with God, and the Word was God. Jesus is the living expression of God — His thought, His will, and His character made visible.', greek: 'Logos', keyVerse: 'John 1:1', category: 'Titles' },
  { term: 'Bread of Life', definition: 'Jesus declared Himself the bread that satisfies the deepest hunger of the human soul. Physical bread sustains the body; Jesus sustains the spirit for eternity.', keyVerse: 'John 6:35', category: 'Titles' },
  { term: 'Living Water', definition: 'Jesus offered the Samaritan woman water that would never run dry — the Holy Spirit flowing from within, giving eternal life and quenching the thirst nothing else can satisfy.', keyVerse: 'John 4:14', category: 'Titles' },
  { term: 'Good Shepherd', definition: 'Jesus as the one who knows His sheep by name, leads them, protects them, and lays down His life for them. The ultimate picture of sacrificial love and personal care.', keyVerse: 'John 10:11', category: 'Titles' },
];

// ── World Religions Comparison ───────────────────────────────────────────────

interface Religion {
  name: string;
  founded: string;
  followers: string;
  keyBeliefs: string[];
  scripture: string;
  godView: string;
  salvation: string;
  connectionToChristianity: string;
  keyDifferences: string[];
}

const RELIGIONS: Religion[] = [
  {
    name: 'Judaism',
    founded: '~2000 BC (Abraham)',
    followers: '~15 million',
    keyBeliefs: ['One God (monotheism)', 'Torah is God\'s Law', 'Covenant people of God', 'Awaiting the Messiah'],
    scripture: 'Torah / Tanakh (Old Testament)',
    godView: 'One God (Yahweh) — same God Christians worship',
    salvation: 'Obedience to the Law, good deeds, repentance',
    connectionToChristianity: 'Christianity grew directly out of Judaism. Jesus was Jewish. The entire Old Testament is shared Scripture. Christians believe Jesus is the Messiah that Judaism still awaits.',
    keyDifferences: [
      'Judaism does not accept Jesus as the Messiah or the Son of God',
      'Christianity teaches the Trinity; Judaism is strictly unitarian monotheism',
      'Christians believe the New Covenant fulfills the Old; Judaism holds the Mosaic covenant as ongoing',
      'Salvation in Judaism comes through Law-keeping and repentance; Christianity teaches salvation by grace through faith',
    ],
  },
  {
    name: 'Islam',
    founded: '610 AD (Muhammad)',
    followers: '~1.9 billion',
    keyBeliefs: ['One God (Allah)', 'Muhammad is the final prophet', 'Five Pillars of Islam', 'Day of Judgment'],
    scripture: 'Quran',
    godView: 'One God (Allah) — claims the same God of Abraham but denies the Trinity',
    salvation: 'Submission to Allah, good deeds outweighing bad, mercy of Allah',
    connectionToChristianity: 'Islam recognizes Jesus (Isa) as a prophet and the Messiah, born of a virgin. It shares many Old Testament figures: Abraham, Moses, Noah, David. But it rejects the crucifixion and resurrection.',
    keyDifferences: [
      'Islam denies that Jesus is the Son of God and denies the Trinity',
      'Islam teaches Jesus was not crucified; Christianity is built on the cross and resurrection',
      'The Quran is considered the final revelation, superseding the Bible; Christianity holds the Bible as complete',
      'Salvation in Islam requires works and submission; Christianity teaches salvation by grace through faith alone',
    ],
  },
  {
    name: 'Hinduism',
    founded: '~1500 BC (no single founder)',
    followers: '~1.2 billion',
    keyBeliefs: ['Many gods/one ultimate reality (Brahman)', 'Karma and reincarnation', 'Dharma (duty/righteousness)', 'Moksha (liberation from rebirth)'],
    scripture: 'Vedas, Upanishads, Bhagavad Gita',
    godView: 'Polytheistic or pantheistic — God is in everything, or many gods are expressions of one reality',
    salvation: 'Liberation (moksha) from the cycle of rebirth through knowledge, devotion, or good works across many lifetimes',
    connectionToChristianity: 'Both traditions value prayer, meditation, scripture study, and moral living. Some Hindu scholars see Jesus as an avatar or enlightened teacher. The concept of a divine being taking human form (incarnation) has parallels.',
    keyDifferences: [
      'Christianity teaches one God; Hinduism embraces many gods or an impersonal ultimate reality',
      'Christianity teaches one life followed by judgment; Hinduism teaches reincarnation across many lifetimes',
      'Salvation in Christianity is through Christ alone; in Hinduism it is through karma, devotion, or knowledge over cycles of rebirth',
      'The Christian God is personal and relational; Brahman in Hinduism is often described as impersonal and beyond attributes',
    ],
  },
  {
    name: 'Buddhism',
    founded: '~500 BC (Siddhartha Gautama)',
    followers: '~500 million',
    keyBeliefs: ['Four Noble Truths', 'Eightfold Path', 'Suffering comes from desire', 'Nirvana (end of suffering)'],
    scripture: 'Tripitaka (Pali Canon)',
    godView: 'No creator God — focuses on personal enlightenment and the nature of suffering',
    salvation: 'Enlightenment (nirvana) through self-effort, meditation, and following the Eightfold Path',
    connectionToChristianity: 'Both teach compassion, selflessness, and the importance of inner transformation. Both recognize that human life involves suffering. Jesus and Buddha both challenged religious establishments.',
    keyDifferences: [
      'Buddhism has no creator God; Christianity centers on a personal God who created and sustains everything',
      'Buddhism teaches self-effort toward enlightenment; Christianity teaches salvation as a gift of grace',
      'The goal of Buddhism is nirvana (cessation of suffering and desire); Christianity offers eternal life in relationship with God',
      'Buddhism sees the self as an illusion; Christianity teaches each person has inherent value as an image-bearer of God',
    ],
  },
  {
    name: 'Sikhism',
    founded: '1469 AD (Guru Nanak)',
    followers: '~30 million',
    keyBeliefs: ['One God', 'Equality of all people', 'Service to others', 'Honest living'],
    scripture: 'Guru Granth Sahib',
    godView: 'One God — formless, timeless, beyond human comprehension',
    salvation: 'Liberation through devotion to God, honest living, and service — escaping reincarnation',
    connectionToChristianity: 'Both are monotheistic. Both emphasize love, service, and devotion to God. Sikhism was influenced by both Hindu and Islamic traditions and shares the Abrahamic emphasis on one Creator.',
    keyDifferences: [
      'Sikhism rejects the idea that God takes human form; Christianity is built on the Incarnation — God becoming man in Jesus',
      'Sikhism teaches reincarnation and karma; Christianity teaches one life, then judgment',
      'Sikhism has no concept of original sin or a need for a savior; Christianity teaches all are sinners in need of Christ',
      'The Guru Granth Sahib is the final authority in Sikhism; the Bible is the final authority in Christianity',
    ],
  },
  {
    name: 'Atheism / Agnosticism',
    founded: 'Ancient (formalized in Enlightenment era)',
    followers: '~1.2 billion (non-religious)',
    keyBeliefs: ['No God exists (atheism) or God\'s existence is unknowable (agnosticism)', 'Morality from reason/empathy', 'Science as primary truth source'],
    scripture: 'None',
    godView: 'No God, or unknown',
    salvation: 'No concept of spiritual salvation — focus on human flourishing in this life',
    connectionToChristianity: 'Many atheists admire Jesus\' ethical teachings even while rejecting His divinity. The Christian tradition of rigorous intellectual inquiry (Augustine, Aquinas) laid groundwork for Western science and philosophy.',
    keyDifferences: [
      'Christianity asserts a personal God exists and has revealed Himself; atheism denies any God exists',
      'Christianity grounds morality in God\'s character; atheism derives morality from reason and social consensus',
      'Christianity offers hope of eternal life beyond death; atheism sees this life as all there is',
      'Christianity explains human purpose through relationship with God; atheism holds that humans must create their own meaning',
    ],
  },
  {
    name: 'Mormonism (LDS)',
    founded: '1830 AD (Joseph Smith)',
    followers: '~17 million',
    keyBeliefs: ['God was once a man who became God', 'Humans can become gods', 'Book of Mormon as additional scripture', 'Temple ordinances required for salvation', 'Baptism for the dead'],
    scripture: 'Bible (KJV) + Book of Mormon + Doctrine & Covenants + Pearl of Great Price',
    godView: 'God the Father has a physical body. Jesus is a separate being. The Holy Ghost is a personage of spirit. Not the Trinity.',
    salvation: 'Faith in Christ + repentance + baptism + laying on of hands + temple endowment + celestial marriage + obedience to LDS commandments',
    connectionToChristianity: 'Uses Christian language and honors Jesus as Savior. Reads the Bible (KJV). Emphasizes family, morality, and service. Many LDS members are deeply devoted and sincere in their faith.',
    keyDifferences: [
      'Mormonism teaches God was once a man who became God; Christianity teaches God is eternal and unchanging',
      'LDS theology says humans can become gods; Christianity teaches God alone is God',
      'The Book of Mormon, Doctrine & Covenants, and Pearl of Great Price are treated as equal to the Bible; Christianity holds the Bible as the complete Word of God',
      'LDS salvation requires temple ordinances and celestial marriage; Christianity teaches salvation by grace through faith alone',
    ],
  },
  {
    name: 'Jehovah\'s Witnesses',
    founded: '1870s (Charles Taze Russell)',
    followers: '~8.7 million',
    keyBeliefs: ['Jehovah is God\'s true name', 'Jesus is Michael the archangel (not God)', 'No Trinity', 'No hell — annihilation instead', '144,000 go to heaven, rest live on paradise earth'],
    scripture: 'New World Translation (their own Bible translation)',
    godView: 'Jehovah alone is God. Jesus is a created being — the first creation. The Holy Spirit is God\'s active force, not a person.',
    salvation: 'Faith + works + obedience to Watchtower organization + door-to-door witnessing + remaining in the organization',
    connectionToChristianity: 'Shares the Old Testament. Honors Jesus as important. Emphasizes morality, Bible study, and evangelism. Members are known for dedication and sacrifice.',
    keyDifferences: [
      'JW teaches Jesus is a created being (Michael the archangel); Christianity teaches Jesus is fully God',
      'JW denies the Trinity; the Trinity is central to orthodox Christianity',
      'JW denies the existence of hell, teaching annihilation instead; Christianity teaches eternal separation from God for the unrepentant',
      'JW salvation requires ongoing works and loyalty to the Watchtower organization; Christianity teaches salvation by grace through faith alone',
    ],
  },
  {
    name: 'Roman Catholicism',
    founded: '33 AD (claims apostolic origin from Peter)',
    followers: '~1.4 billion',
    keyBeliefs: ['Apostolic succession from Peter', 'Seven sacraments', 'Authority of Pope and Magisterium', 'Sacred Scripture AND Sacred Tradition', 'Veneration of Mary and saints', 'Purgatory'],
    scripture: 'Bible (73 books — includes Deuterocanonical/Apocrypha) + Sacred Tradition',
    godView: 'Trinitarian — Father, Son, and Holy Spirit. Same as Protestant Christianity.',
    salvation: 'Grace through faith, but sustained through sacraments (baptism, Eucharist, confession, etc.), good works, and remaining in a state of grace. Mortal sin can cause loss of salvation.',
    connectionToChristianity: 'Catholicism IS Christianity — the largest and oldest continuous Christian institution. Protestants split from Catholicism in 1517. Both affirm the Trinity, the deity of Christ, His death and resurrection, and the authority of Scripture. The core Gospel is shared.',
    keyDifferences: [
      'Catholics hold Sacred Tradition as equal to Scripture; Protestants hold Scripture alone (sola scriptura)',
      'Catholics believe the Pope is Christ\'s vicar on earth with special authority; Protestants reject papal authority',
      'Catholics practice confession to a priest for absolution; Protestants confess directly to God',
      'Catholics teach purgatory as a place of purification after death; Protestants reject purgatory',
      'Catholics venerate Mary as sinless and ever-virgin; Protestants honor Mary but deny these doctrines',
      'Catholics believe the Eucharist IS the literal body and blood of Christ (transubstantiation); most Protestants see it as symbolic',
    ],
  },
  {
    name: 'Eastern Orthodox',
    founded: '33 AD (claims apostolic origin; formally split from Rome in 1054 AD)',
    followers: '~220 million',
    keyBeliefs: ['Holy Tradition alongside Scripture', 'Seven Ecumenical Councils', 'Theosis (becoming like God)', 'Veneration of icons', 'No Pope — governed by patriarchs', 'Mystery of the sacraments'],
    scripture: 'Bible (includes Deuterocanonical books) + Holy Tradition',
    godView: 'Trinitarian — but differs from Western Christianity on the filioque clause (whether the Holy Spirit proceeds from the Father alone or from Father and Son)',
    salvation: 'Theosis — an ongoing process of becoming more like God through participation in divine life. Salvation is not a one-time event but a lifelong journey of transformation through grace, sacraments, and prayer.',
    connectionToChristianity: 'Eastern Orthodoxy IS Christianity — one of the three major branches alongside Catholicism and Protestantism. Rich in ancient liturgy, iconography, and mystical theology. Preserves the earliest Christian worship traditions.',
    keyDifferences: [
      'Orthodox reject the Pope\'s supreme authority; governed by a council of patriarchs',
      'Orthodox emphasize theosis (becoming like God); Protestants emphasize justification by faith',
      'Orthodox use icons extensively in worship; many Protestants avoid religious images',
      'Orthodox baptize infants by full immersion and confirm immediately; Protestant practices vary',
      'Orthodox theology is more mystical and experiential; Protestant theology tends to be more doctrinal and systematic',
      'Orthodox have married priests (but celibate bishops); Catholic priests are celibate',
    ],
  },
  {
    name: 'Baptist',
    founded: '1609 AD (John Smyth, Amsterdam)',
    followers: '~100 million',
    keyBeliefs: ['Believer\'s baptism only (no infant baptism)', 'Local church autonomy', 'Authority of Scripture alone', 'Priesthood of all believers', 'Separation of church and state'],
    scripture: 'Bible (66 books)',
    godView: 'Trinitarian — Father, Son, and Holy Spirit',
    salvation: 'By grace alone through faith alone in Christ alone. Once saved, always saved (eternal security) — though some Baptist groups disagree on this.',
    connectionToChristianity: 'Baptist churches are Protestant Christian churches. One of the largest Protestant groups worldwide. Known for strong evangelism, Bible preaching, and personal faith commitment.',
    keyDifferences: [
      'Baptists reject infant baptism, requiring a personal profession of faith before baptism; many other denominations baptize infants',
      'Baptist churches are autonomous — no denominational hierarchy; Catholics and Orthodox have centralized authority',
      'Most Baptists hold to eternal security (once saved, always saved); Catholics and some Protestants believe salvation can be lost',
      'Baptists generally practice symbolic communion; Catholics believe in literal transubstantiation',
    ],
  },
  {
    name: 'Pentecostal / Charismatic',
    founded: '1901–1906 (Azusa Street Revival)',
    followers: '~650 million (including Charismatics)',
    keyBeliefs: ['Baptism of the Holy Spirit with evidence of speaking in tongues', 'Active spiritual gifts today (healing, prophecy, miracles)', 'Vibrant worship', 'Divine healing'],
    scripture: 'Bible (66 books)',
    godView: 'Trinitarian — with strong emphasis on the active work of the Holy Spirit today',
    salvation: 'By grace through faith in Christ. Baptism of the Holy Spirit is a separate experience after salvation.',
    connectionToChristianity: 'Pentecostalism is Protestant Christianity with a strong emphasis on the experiential work of the Holy Spirit. The fastest-growing segment of Christianity globally.',
    keyDifferences: [
      'Pentecostals believe speaking in tongues is the initial evidence of Spirit baptism; most other denominations disagree',
      'Pentecostals expect active miracles, healings, and prophecy today; cessationists believe these gifts ended with the apostles',
      'Pentecostal worship is highly expressive and emotional; liturgical traditions are more structured and formal',
      'Some Pentecostal groups (Oneness) reject the Trinity, teaching Jesus-only theology; mainstream Pentecostals are Trinitarian',
    ],
  },
  {
    name: 'Methodist',
    founded: '1730s (John Wesley, England)',
    followers: '~80 million',
    keyBeliefs: ['Personal holiness and sanctification', 'Social justice and compassion', 'Prevenient grace (God reaches out first)', 'Quadrilateral: Scripture, tradition, reason, experience'],
    scripture: 'Bible (66 books)',
    godView: 'Trinitarian — Father, Son, and Holy Spirit',
    salvation: 'By grace through faith. Emphasizes both justification (being made right with God) and sanctification (ongoing growth in holiness). Believes salvation can be lost through persistent, willful sin.',
    connectionToChristianity: 'Methodism grew out of the Church of England through John Wesley\'s revival movement. Known for hymn singing, social outreach, and methodical spiritual discipline.',
    keyDifferences: [
      'Methodists believe salvation can be lost; Baptists and Reformed traditions generally teach eternal security',
      'Methodists practice infant baptism; Baptists and Pentecostals do not',
      'Methodists emphasize social justice as part of the Gospel; some evangelical groups focus more on personal salvation',
      'Methodists use the Wesleyan Quadrilateral (Scripture, tradition, reason, experience); Reformed traditions hold to Scripture alone',
    ],
  },
  {
    name: 'Lutheran',
    founded: '1517 (Martin Luther, Germany)',
    followers: '~77 million',
    keyBeliefs: ['Justification by faith alone', 'Scripture alone (sola scriptura)', 'Grace alone (sola gratia)', 'Sacramental theology (baptism and communion convey grace)', 'Two kingdoms doctrine'],
    scripture: 'Bible (66 books)',
    godView: 'Trinitarian — Father, Son, and Holy Spirit',
    salvation: 'By grace alone through faith alone — the core insight of the Reformation. Good works are the fruit of faith, not the cause of salvation.',
    connectionToChristianity: 'Lutheranism is the original Protestant denomination. Martin Luther\'s 95 Theses sparked the Reformation. Lutheran theology profoundly shaped all of Protestant Christianity.',
    keyDifferences: [
      'Lutherans believe Christ is truly present "in, with, and under" communion bread and wine; most evangelicals see communion as symbolic',
      'Lutherans practice infant baptism as a means of grace; Baptists and Pentecostals reject infant baptism',
      'Lutherans maintain a more liturgical worship style; many evangelical churches are contemporary and informal',
      'Luther kept many Catholic practices he considered biblical; Reformed traditions stripped more away',
    ],
  },
  {
    name: 'Presbyterian / Reformed',
    founded: '1530s–1560s (John Calvin, John Knox)',
    followers: '~75 million',
    keyBeliefs: ['God\'s absolute sovereignty', 'Predestination and election', 'TULIP (Total depravity, Unconditional election, Limited atonement, Irresistible grace, Perseverance)', 'Covenant theology', 'Governed by elders (presbyters)'],
    scripture: 'Bible (66 books)',
    godView: 'Trinitarian — with strong emphasis on God\'s sovereignty over all things',
    salvation: 'By God\'s sovereign election and grace alone. Those whom God predestines to salvation will persevere to the end. Cannot be lost.',
    connectionToChristianity: 'Reformed/Presbyterian churches trace to John Calvin\'s Geneva and John Knox\'s Scotland. Deeply influential in Protestant theology, education, and Western culture.',
    keyDifferences: [
      'Reformed theology teaches predestination — God chooses who will be saved; Arminian traditions (Methodist, many Baptist) teach free will in salvation',
      'Reformed theology teaches limited atonement — Christ died specifically for the elect; most other traditions teach Christ died for all people',
      'Presbyterian governance is by elected elders; Baptist churches are congregationally governed; Episcopal churches have bishops',
      'Reformed worship tends to be Word-centered and simple; Pentecostal worship emphasizes the Spirit and experience',
    ],
  },
  {
    name: 'Anglican / Episcopal',
    founded: '1534 (Henry VIII\'s break from Rome)',
    followers: '~85 million',
    keyBeliefs: ['Via media (middle way between Catholic and Protestant)', 'Book of Common Prayer', 'Three-fold ministry: bishops, priests, deacons', 'Scripture, tradition, and reason', 'Broad theological diversity'],
    scripture: 'Bible (some include Apocrypha for reading)',
    godView: 'Trinitarian — Father, Son, and Holy Spirit',
    salvation: 'By grace through faith. Anglicanism encompasses a wide spectrum — from evangelical (faith alone) to Anglo-Catholic (sacramental) perspectives.',
    connectionToChristianity: 'Anglicanism began as the Church of England. It retains Catholic liturgical structure with Protestant theology. The Episcopal Church is its American branch.',
    keyDifferences: [
      'Anglicans maintain bishops in apostolic succession; most Protestant churches do not',
      'Anglican theology is intentionally broad — from evangelical to Anglo-Catholic; most denominations have narrower theological boundaries',
      'Anglicans use the Book of Common Prayer for structured worship; free church traditions use spontaneous worship',
      'Some Anglican provinces ordain women and affirm same-sex marriage; more conservative branches do not',
    ],
  },
  {
    name: 'Seventh-day Adventist',
    founded: '1863 (Ellen G. White)',
    followers: '~22 million',
    keyBeliefs: ['Saturday Sabbath worship', 'Imminent return of Christ', 'Health-conscious lifestyle', 'Soul sleep (unconscious state in death)', 'Investigative judgment since 1844'],
    scripture: 'Bible (66 books) + writings of Ellen G. White as prophetic guidance',
    godView: 'Trinitarian — Father, Son, and Holy Spirit',
    salvation: 'By grace through faith in Christ. Obedience to God\'s law (including Sabbath) is a response to salvation, not a cause of it — though critics say the emphasis on law-keeping blurs this line.',
    connectionToChristianity: 'Adventists are Protestant Christians who emphasize the soon return of Christ and the seventh-day Sabbath. Known globally for hospitals, schools, and health ministry.',
    keyDifferences: [
      'Adventists worship on Saturday; most Christians worship on Sunday',
      'Adventists teach soul sleep — the dead are unconscious until resurrection; most Christians believe in immediate conscious afterlife',
      'Adventists hold Ellen G. White\'s writings as prophetically inspired guidance; other Protestants reject post-biblical prophets',
      'Adventists teach an investigative judgment began in 1844; no other Christian tradition holds this doctrine',
    ],
  },
  {
    name: 'Non-Denominational',
    founded: '20th century (various)',
    followers: '~20+ million (fastest-growing in the US)',
    keyBeliefs: ['Bible as sole authority', 'Personal relationship with Jesus', 'Contemporary worship', 'Community and small groups', 'Varies widely by church'],
    scripture: 'Bible (66 books)',
    godView: 'Trinitarian — Father, Son, and Holy Spirit',
    salvation: 'By grace through faith in Christ alone. Generally evangelical in theology.',
    connectionToChristianity: 'Non-denominational churches are Protestant Christian churches that choose not to affiliate with any formal denomination. They are the fastest-growing segment of Christianity in America.',
    keyDifferences: [
      'No formal denominational structure or hierarchy; each church is fully autonomous',
      'Theology varies widely — some are Reformed, some Charismatic, some Arminian',
      'Worship style tends to be contemporary and casual; liturgical traditions are more formal',
      'Accountability structures vary since there\'s no denominational oversight',
    ],
  },
  {
    name: 'Bahá\'í Faith',
    founded: '1863 (Bahá\'u\'lláh, Persia)',
    followers: '~8 million',
    keyBeliefs: ['Unity of all religions', 'Progressive revelation — each age gets a new messenger', 'Unity of humanity', 'Elimination of prejudice', 'Harmony of science and religion'],
    scripture: 'Kitáb-i-Aqdas, Kitáb-i-Íqán, and other writings of Bahá\'u\'lláh',
    godView: 'One God — unknowable in essence but known through His messengers (Manifestations of God)',
    salvation: 'Spiritual progress through recognizing God\'s messenger for this age (Bahá\'u\'lláh), prayer, service, and moral living. Afterlife is spiritual progress, not heaven/hell as traditionally understood.',
    connectionToChristianity: 'Bahá\'ís honor Jesus as a Manifestation of God — one of many divine messengers including Abraham, Moses, Muhammad, and Bahá\'u\'lláh. They accept the Bible but believe Bahá\'u\'lláh brings the latest revelation.',
    keyDifferences: [
      'Bahá\'í teaches all religions are from one God and progressively revealed; Christianity teaches Jesus is the unique and final revelation',
      'Bahá\'í sees Jesus as one of many equal messengers; Christianity teaches Jesus is uniquely God incarnate',
      'Bahá\'í rejects the Trinity and the deity of Christ; these are central to Christianity',
      'Bahá\'í teaches no eternal hell; Christianity teaches eternal consequences for rejecting God',
    ],
  },
  {
    name: 'Zoroastrianism',
    founded: '~1500–500 BC (Zoroaster/Zarathustra, Persia)',
    followers: '~120,000',
    keyBeliefs: ['One supreme God (Ahura Mazda)', 'Cosmic battle between good and evil', 'Free will to choose good or evil', 'Judgment after death', 'Final renovation of the world'],
    scripture: 'Avesta (including the Gathas)',
    godView: 'Monotheistic — Ahura Mazda is the one true God, opposed by Angra Mainyu (destructive spirit)',
    salvation: 'Good thoughts, good words, good deeds. After death, the soul is judged and crosses the Bridge of the Separator to paradise or punishment.',
    connectionToChristianity: 'Many scholars believe Zoroastrianism influenced Jewish and Christian concepts of heaven, hell, angels, demons, a final judgment, and a coming savior. The Magi who visited baby Jesus may have been Zoroastrian priests.',
    keyDifferences: [
      'Zoroastrianism predates Christianity and has no concept of Christ or the Gospel',
      'Zoroastrian salvation is through good deeds; Christianity teaches salvation by grace through faith',
      'Zoroastrianism is ethnic — primarily Persian/Parsi; Christianity is universal',
      'Zoroastrianism teaches a cosmic dualism between good and evil spirits; Christianity teaches God is supreme and Satan is a defeated creature',
    ],
  },
  {
    name: 'Shinto',
    founded: 'Ancient (prehistoric Japan, no single founder)',
    followers: '~4 million (dedicated); ~70 million practice elements',
    keyBeliefs: ['Kami (spirits/gods) inhabit nature', 'Ritual purity', 'Reverence for ancestors', 'Harmony with nature', 'No formal doctrine or moral code'],
    scripture: 'Kojiki, Nihon Shoki (mythological histories, not scripture in the Western sense)',
    godView: 'Polytheistic/animistic — countless kami (spirits) in nature, ancestors, and sacred places',
    salvation: 'No concept of salvation or sin in the Christian sense. Focus is on ritual purity, harmony, and living in balance with the kami and community.',
    connectionToChristianity: 'Very little direct connection. Some Japanese Christians integrate cultural Shinto practices (seasonal festivals, respect for nature) with their faith. Both traditions value gratitude and reverence.',
    keyDifferences: [
      'Shinto has no creator God, no doctrine of sin, and no concept of salvation; all are central to Christianity',
      'Shinto is rooted in Japanese ethnic identity; Christianity is universal',
      'Shinto focuses on this-worldly harmony and purity rituals; Christianity focuses on eternal relationship with God',
      'Shinto has no moral code or commandments; Christianity has clear moral teachings rooted in God\'s character',
    ],
  },
  {
    name: 'Jainism',
    founded: '~600 BC (Mahavira, India)',
    followers: '~5 million',
    keyBeliefs: ['Ahimsa (extreme non-violence)', 'Karma and reincarnation', 'Asceticism and self-discipline', 'No creator God', 'Liberation through self-effort'],
    scripture: 'Agamas (Jain scriptures)',
    godView: 'No creator God. Liberated souls (Tirthankaras) are revered but are not gods in the theistic sense.',
    salvation: 'Liberation (moksha) from the cycle of rebirth through strict non-violence, truthfulness, non-attachment, and severe ascetic practices over many lifetimes.',
    connectionToChristianity: 'Both traditions value non-violence, truthfulness, and self-discipline. Jain ethics of compassion toward all living beings resonates with Jesus\' teachings on love and mercy.',
    keyDifferences: [
      'Jainism has no creator God; Christianity centers on a personal creator God',
      'Jainism teaches liberation through extreme self-effort and asceticism; Christianity teaches salvation as a free gift of grace',
      'Jainism teaches reincarnation; Christianity teaches one life followed by judgment',
      'Jain monks practice extreme austerity (some don\'t wear clothes, sweep the ground before walking); Christianity does not require asceticism for salvation',
    ],
  },
  {
    name: 'New Age / Spiritualism',
    founded: '1960s–1970s (modern form; roots in 19th-century occultism)',
    followers: '~30+ million (loosely defined)',
    keyBeliefs: ['You are God / divine within', 'All paths lead to the same truth', 'Crystals, energy healing, chakras', 'Manifestation and law of attraction', 'Reincarnation', 'No absolute truth or moral authority'],
    scripture: 'No single text — draws from many traditions, self-help books, and channeled writings',
    godView: 'Pantheistic — God is an impersonal force or energy that permeates everything. "You are God." The universe itself is divine.',
    salvation: 'Self-realization and spiritual awakening. There is no sin to be saved from — only ignorance to overcome. Enlightenment through meditation, energy work, and raising consciousness.',
    connectionToChristianity: 'New Age borrows Christian language ("Christ consciousness," "spirit," "love") but redefines every term. Jesus is seen as an enlightened teacher or ascended master, not the unique Son of God.',
    keyDifferences: [
      'New Age teaches "you are God"; Christianity teaches God is separate from and above creation',
      'New Age denies the reality of sin; Christianity teaches all have sinned and need a Savior',
      'New Age says all paths lead to God; Jesus said "I am the way, the truth, and the life — no one comes to the Father except through me"',
      'New Age relies on self-effort and spiritual practices; Christianity relies on Christ\'s finished work on the cross',
      'New Age has no moral authority; Christianity grounds morality in God\'s unchanging character',
    ],
  },
  {
    name: 'Christian Science',
    founded: '1879 (Mary Baker Eddy)',
    followers: '~100,000',
    keyBeliefs: ['Matter and sickness are illusions', 'Healing through prayer and spiritual understanding', 'God is the only reality', 'Sin, disease, and death are not real', 'The Bible interpreted through Science and Health'],
    scripture: 'Bible + Science and Health with Key to the Scriptures by Mary Baker Eddy',
    godView: 'God is infinite Mind, Spirit, and Principle — not a personal being. Denies the Trinity in the traditional sense.',
    salvation: 'Salvation is understanding that sin, sickness, and death are illusions. As one gains spiritual understanding, they are freed from the false belief in material existence.',
    connectionToChristianity: 'Uses Christian language and reads the Bible. Honors Jesus as the "Way-shower." Named "Christian" Science. But its theology is fundamentally different from historic Christianity.',
    keyDifferences: [
      'Christian Science denies the physical reality of sickness and death; Christianity acknowledges physical suffering as real',
      'Christian Science rejects the Trinity and the deity of Christ in the traditional sense; these are essential to Christianity',
      'Christian Science sees the atonement as an example, not a substitutionary sacrifice; Christianity teaches Christ died in our place',
      'Christian Science discourages medical treatment in favor of prayer alone; mainstream Christianity sees medicine as compatible with faith',
    ],
  },
  {
    name: 'Unitarian Universalism',
    founded: '1961 (merger of Unitarians and Universalists; roots in the 1500s)',
    followers: '~800,000',
    keyBeliefs: ['Inherent worth of every person', 'No creed required', 'All religious paths are valid', 'Justice, equity, and compassion', 'Free and responsible search for truth'],
    scripture: 'No single scripture — draws wisdom from all religious and secular sources',
    godView: 'Varies — members may be theist, atheist, agnostic, pagan, Buddhist, or anything else. No shared belief about God is required.',
    salvation: 'No concept of salvation from sin. Focus is on creating heaven on earth through justice, compassion, and personal growth.',
    connectionToChristianity: 'Historically rooted in Christianity — early Unitarians rejected the Trinity, and Universalists rejected eternal hell. Today most UU congregations are post-Christian, drawing from many traditions.',
    keyDifferences: [
      'UU has no required beliefs about God, Jesus, or salvation; Christianity has core non-negotiable doctrines',
      'UU rejects the Trinity — its founding principle; the Trinity is central to Christianity',
      'UU teaches all paths are equally valid; Christianity teaches Jesus is the only way to God',
      'UU rejects the concept of sin and hell; Christianity teaches both are real',
    ],
  },
  {
    name: 'Scientology',
    founded: '1954 (L. Ron Hubbard)',
    followers: '~20,000–50,000 (disputed; church claims millions)',
    keyBeliefs: ['Humans are immortal spiritual beings (thetans)', 'Past-life traumas cause present problems', 'Auditing (counseling) clears negative engrams', 'Eight dynamics of existence', 'Xenu and the OT levels (advanced teachings)'],
    scripture: 'Dianetics by L. Ron Hubbard + extensive church writings',
    godView: 'Vague — acknowledges a Supreme Being but does not define it. God is not central to the theology. Members can believe whatever they want about God.',
    salvation: 'Spiritual freedom through auditing — clearing the mind of past traumas and engrams. Advancement through increasingly expensive levels (OT levels). No concept of sin or divine grace.',
    connectionToChristianity: 'Very little. Scientology uses some religious language and claims tax-exempt religious status. Jesus is acknowledged only as a historical figure. The theology has no meaningful overlap with Christianity.',
    keyDifferences: [
      'Scientology has no concept of a personal God, sin, or grace; all are central to Christianity',
      'Scientology teaches self-salvation through auditing; Christianity teaches salvation as a free gift from God',
      'Scientology charges for spiritual advancement; Christianity teaches the Gospel is free',
      'Scientology was founded by a science fiction writer in 1954; Christianity traces to Jesus Christ 2,000 years ago',
    ],
  },
  {
    name: 'Confucianism',
    founded: '~500 BC (Confucius, China)',
    followers: '~6 million (dedicated); influences hundreds of millions',
    keyBeliefs: ['Filial piety (respect for parents and ancestors)', 'Five key relationships', 'Ren (benevolence/humaneness)', 'Li (ritual propriety)', 'Education and self-cultivation'],
    scripture: 'The Analects, Five Classics, Four Books',
    godView: 'Not focused on God. References "Tian" (Heaven) as a moral force or cosmic order, not a personal deity.',
    salvation: 'No concept of spiritual salvation. The goal is to become a "junzi" (noble person) through education, moral cultivation, and fulfilling social responsibilities.',
    connectionToChristianity: 'Both value moral living, respect for authority, education, and social responsibility. Early Jesuit missionaries saw Confucianism as compatible with Christianity. Both teach the golden rule.',
    keyDifferences: [
      'Confucianism is a moral philosophy, not a religion with a personal God; Christianity is centered on relationship with a personal God',
      'Confucianism has no concept of sin, salvation, or afterlife; all are central to Christianity',
      'Confucianism focuses on social harmony in this life; Christianity focuses on eternal destiny',
      'Confucianism teaches self-improvement through effort; Christianity teaches transformation through grace',
    ],
  },
  {
    name: 'Taoism (Daoism)',
    founded: '~400 BC (Laozi, China)',
    followers: '~12 million',
    keyBeliefs: ['The Tao (Way) — the ultimate, unknowable principle', 'Wu wei (effortless action / going with the flow)', 'Yin and yang (balance of opposites)', 'Simplicity and naturalness', 'Harmony with nature'],
    scripture: 'Tao Te Ching (Laozi), Zhuangzi',
    godView: 'The Tao is not a personal God — it is the nameless, formless source of everything. "The Tao that can be told is not the eternal Tao."',
    salvation: 'No salvation in the Christian sense. The goal is to live in harmony with the Tao — effortless, natural, and free from striving. Some Taoist traditions include immortality practices.',
    connectionToChristianity: 'Both traditions value humility, simplicity, and living in alignment with a higher reality. Some see parallels between the Tao and the Logos (Word) in John 1:1.',
    keyDifferences: [
      'The Tao is impersonal and unknowable; the Christian God is personal, relational, and has revealed Himself',
      'Taoism has no concept of sin or moral law; Christianity has clear moral absolutes rooted in God\'s character',
      'Taoism teaches going with the flow (wu wei); Christianity teaches active obedience to God\'s will',
      'Taoism has no savior figure; Christianity is centered on Jesus as the only Savior',
    ],
  },
  {
    name: 'Folk / Indigenous Religions',
    founded: 'Prehistoric (various cultures worldwide)',
    followers: '~400 million',
    keyBeliefs: ['Spirits inhabit nature and ancestors', 'Rituals for harvest, healing, and protection', 'Community-centered spirituality', 'Oral traditions passed through generations', 'Shamans or spiritual leaders as intermediaries'],
    scripture: 'Oral traditions — no written scriptures',
    godView: 'Varies — animistic (spirits in nature), polytheistic (many gods), or henotheistic (one supreme god among many spirits)',
    salvation: 'No universal concept of salvation. Focus is on maintaining harmony with spirits, ancestors, and the natural world through rituals, sacrifices, and taboos.',
    connectionToChristianity: 'Christian missionaries have engaged with folk religions for centuries. Some elements — belief in a supreme creator, spirits, afterlife, sacrifice — can serve as bridges to the Gospel. Contextualization is a key missiological discussion.',
    keyDifferences: [
      'Folk religions are localized and ethnic; Christianity claims universal truth for all people',
      'Folk religions often involve appeasing spirits through fear; Christianity offers relationship with a loving God',
      'Folk religions have no concept of sin against a holy God; Christianity teaches all have sinned',
      'Folk religions rely on shamans and rituals; Christianity teaches direct access to God through Jesus',
    ],
  },
];

// ── Religion Groups — grouped by family, alphabetical within each ─────────────
const RELIGION_GROUPS: { label: string; overview: string; names: string[] }[] = [
  {
    label: 'Abrahamic Faiths',
    overview: 'Trace their roots to Abraham and worship one God — but differ deeply on who Jesus is.',
    names: ['Judaism', 'Islam', 'Bahá\'í Faith', 'Sikhism'],
  },
  {
    label: 'Christian Traditions',
    overview: 'All affirm Jesus as Lord and Savior — but vary widely on church authority, sacraments, and practice.',
    names: [
      'Roman Catholicism', 'Eastern Orthodox', 'Anglican / Episcopal',
      'Baptist', 'Lutheran', 'Methodist', 'Presbyterian / Reformed',
      'Pentecostal / Charismatic', 'Seventh-day Adventist', 'Non-Denominational',
      'Mormonism (LDS)', 'Jehovah\'s Witnesses', 'Christian Science', 'Unitarian Universalism',
    ],
  },
  {
    label: 'Eastern Religions',
    overview: 'Ancient traditions centered on karma, dharma, and the cycle of rebirth — generally without a personal creator God.',
    names: ['Buddhism', 'Confucianism', 'Hinduism', 'Jainism', 'Shinto', 'Taoism (Daoism)'],
  },
  {
    label: 'Other Worldviews',
    overview: 'Philosophical, secular, or syncretic perspectives that fall outside the major religious families.',
    names: ['Atheism / Agnosticism', 'Folk / Indigenous Religions', 'New Age / Spiritualism', 'Scientology', 'Zoroastrianism'],
  },
];

// ── Names of God (integrated into terms) ─────────────────────────────────────

const GOD_NAMES = [
  { hebrew: 'Elohim', english: 'God / Creator', meaning: 'The all-powerful Creator. Used 2,600+ times.', ref: 'Genesis 1:1', category: 'Power', verse: 'In the beginning God created the heaven and the earth.' },
  { hebrew: 'Yahweh (YHWH)', english: 'LORD / I AM', meaning: 'The self-existent, eternal, covenant-keeping God. The most sacred name.', ref: 'Exodus 3:14', category: 'Covenant', verse: 'And God said unto Moses, I AM THAT I AM.' },
  { hebrew: 'Adonai', english: 'Lord / Master', meaning: 'God as sovereign ruler and master over all.', ref: 'Psalm 8:1', category: 'Authority', verse: 'O LORD our Lord, how excellent is thy name in all the earth!' },
  { hebrew: 'El Shaddai', english: 'God Almighty', meaning: 'The all-sufficient God who provides and sustains.', ref: 'Genesis 17:1', category: 'Provision', verse: 'I am the Almighty God; walk before me, and be thou perfect.' },
  { hebrew: 'El Elyon', english: 'God Most High', meaning: 'The supreme God above all powers.', ref: 'Genesis 14:18-20', category: 'Power', verse: 'Blessed be Abram of the most high God, possessor of heaven and earth.' },
  { hebrew: 'El Roi', english: 'God Who Sees', meaning: 'The God who sees the oppressed and forgotten. Named by Hagar.', ref: 'Genesis 16:13', category: 'Comfort', verse: 'Thou God seest me.' },
  { hebrew: 'Yahweh Yireh', english: 'The LORD Will Provide', meaning: 'Named by Abraham on Mount Moriah after God provided the ram.', ref: 'Genesis 22:14', category: 'Provision', verse: 'In the mount of the LORD it shall be seen.' },
  { hebrew: 'Yahweh Rapha', english: 'The LORD Who Heals', meaning: 'God as healer of body, mind, and spirit.', ref: 'Exodus 15:26', category: 'Healing', verse: 'I am the LORD that healeth thee.' },
  { hebrew: 'Yahweh Nissi', english: 'The LORD Our Banner', meaning: 'God as our victory in battle.', ref: 'Exodus 17:15', category: 'Protection', verse: 'And Moses built an altar, and called the name of it Jehovahnissi.' },
  { hebrew: 'Yahweh Shalom', english: 'The LORD Is Peace', meaning: 'God as the source of wholeness and peace. Named by Gideon.', ref: 'Judges 6:24', category: 'Peace', verse: 'Then Gideon built an altar there unto the LORD, and called it Jehovahshalom.' },
  { hebrew: 'Yahweh Rohi', english: 'The LORD My Shepherd', meaning: 'God as the caring, guiding, protecting shepherd.', ref: 'Psalm 23:1', category: 'Comfort', verse: 'The LORD is my shepherd; I shall not want.' },
  { hebrew: 'Yahweh Shammah', english: 'The LORD Is There', meaning: 'God\'s promise of eternal presence. He will never leave.', ref: 'Ezekiel 48:35', category: 'Presence', verse: 'And the name of the city from that day shall be, The LORD is there.' },
  { hebrew: 'Abba', english: 'Father', meaning: 'The intimate name for God as Father. Given through the Spirit.', ref: 'Romans 8:15', category: 'Intimacy', verse: 'Ye have received the Spirit of adoption, whereby we cry, Abba, Father.' },
];

// ── Tile fade — interpolates blue→green→purple across the full grid ──────────
function tileFadeColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1);
  // 0→0.5: blue(#60a5fa)→green(#34d399)  0.5→1: green→purple(#a78bfa)
  const stops = [[0x60,0xa5,0xfa],[0x34,0xd3,0x99],[0xa7,0x8b,0xfa]];
  const seg = t < 0.5 ? 0 : 1;
  const lt  = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const c1 = stops[seg], c2 = stops[seg + 1];
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * lt);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * lt);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * lt);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ── Religion Tile (extracted to avoid Turbopack JSX parsing issues) ──────────
function ReligionTile({ r, isA, isB, accentColor, tileIndex, totalTiles, onPress }: {
  r: typeof RELIGIONS[0];
  isA: boolean;
  isB: boolean;
  accentColor: string;
  tileIndex: number;
  totalTiles: number;
  onPress: () => void;
}) {
  const fadeColor = tileFadeColor(tileIndex, totalTiles);
  const selColor = isA ? accentColor : '#fb923c';
  const topColor = isA || isB ? selColor : accentColor;
  const botColor = isA || isB ? selColor : fadeColor;

  return (
    <button onClick={onPress}
      className="text-left rounded-2xl overflow-hidden transition-all active:scale-[0.97] relative w-full"
      style={{
        background: `linear-gradient(180deg, ${topColor}12 0%, ${botColor}1a 100%)`,
        border: `1px solid ${isA || isB ? selColor + '50' : accentColor + '18'}`,
        boxShadow: isA || isB ? `0 4px 20px ${selColor}18` : 'none',
      }}>
      {/* Top accent bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${topColor}bb, ${botColor}44)` }} />

      <div className="relative px-3 pt-3 pb-3 overflow-hidden">
        {/* Ghost initial */}
        <div className="absolute -bottom-2 -right-1 font-black select-none pointer-events-none leading-none"
          style={{ fontSize: 44, color: `${botColor}14`, fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-2px' }}>
          {r.name[0]}
        </div>

        {/* Selection badge */}
        {(isA || isB) && (
          <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black z-10"
            style={{ background: selColor, color: '#fff', boxShadow: `0 0 8px ${selColor}66` }}>
            {isA ? '1' : '2'}
          </div>
        )}

        {/* Dot + name */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor, boxShadow: `0 0 5px ${accentColor}99` }} />
          <p className="text-xs font-black leading-tight pr-5" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.01em' }}>
            {r.name}
          </p>
        </div>

        {/* Followers */}
        <p className="text-[9px] font-semibold mb-1" style={{ color: `${botColor}90` }}>{r.followers}</p>

        {/* Scripture pill */}
        <span className="inline-block text-[8px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: `${botColor}14`, border: `1px solid ${botColor}28`, color: `${botColor}aa` }}>
          {r.scripture}
        </span>
      </div>
    </button>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

// ── Books of the Bible ────────────────────────────────────────────────────────
interface BibleBook {
  name: string; testament: 'OT' | 'NT'; category: string;
  author: string; date: string; chapters: number;
  theme: string; keyVerse: string; summary: string;
}
const BIBLE_BOOKS: BibleBook[] = [
  // ── Law ──
  { name:'Genesis', testament:'OT', category:'Law', author:'Moses', date:'~1445–1405 BC', chapters:50, theme:'Beginnings — creation, the fall, the covenant', keyVerse:'Genesis 1:1', summary:'God creates the world, humanity falls, and He begins His plan to redeem it through one family.' },
  { name:'Exodus', testament:'OT', category:'Law', author:'Moses', date:'~1445–1405 BC', chapters:40, theme:'Redemption and the Law', keyVerse:'Exodus 20:2', summary:'God rescues Israel from slavery in Egypt and gives them His law — a picture of every deliverance to come.' },
  { name:'Leviticus', testament:'OT', category:'Law', author:'Moses', date:'~1445–1405 BC', chapters:27, theme:'Holiness and sacrifice', keyVerse:'Leviticus 19:2', summary:'God shows Israel how to approach a holy God — through sacrifice, cleansing, and obedience. Every offering points to Jesus.' },
  { name:'Numbers', testament:'OT', category:'Law', author:'Moses', date:'~1445–1405 BC', chapters:36, theme:'Faithfulness and wandering', keyVerse:'Numbers 6:24-26', summary:'Israel wanders the wilderness for 40 years because of unbelief — a sobering picture of what disobedience costs.' },
  { name:'Deuteronomy', testament:'OT', category:'Law', author:'Moses', date:'~1405 BC', chapters:34, theme:'Love God with all your heart', keyVerse:'Deuteronomy 6:5', summary:'Moses gives Israel a final sermon before they enter the Promised Land, calling them to love and obey the God who saved them.' },
  // ── History ──
  { name:'Joshua', testament:'OT', category:'History', author:'Joshua', date:'~1405–1385 BC', chapters:24, theme:'God keeps His promises', keyVerse:'Joshua 1:9', summary:'Under Joshua, Israel finally enters the Promised Land — God proves He always delivers on what He said.' },
  { name:'Judges', testament:'OT', category:'History', author:'Unknown', date:'~1043 BC', chapters:21, theme:'The cycle of sin and rescue', keyVerse:'Judges 21:25', summary:'Israel spirals through the same cycle repeatedly: sin, oppression, crying out, rescue — showing the deep need for a king and a Savior.' },
  { name:'Ruth', testament:'OT', category:'History', author:'Unknown', date:'~1000 BC', chapters:4, theme:'Loyalty, love, and redemption', keyVerse:'Ruth 1:16', summary:'A Moabite widow\'s faithfulness leads her into the family line of Jesus — God\'s grace reaches every nation.' },
  { name:'1 Samuel', testament:'OT', category:'History', author:'Samuel / Nathan / Gad', date:'~931 BC', chapters:31, theme:'The birth of the kingdom', keyVerse:'1 Samuel 16:7', summary:'Israel demands a king, gets Saul, loses him to pride, and discovers the shepherd boy David whom God has chosen.' },
  { name:'2 Samuel', testament:'OT', category:'History', author:'Nathan / Gad', date:'~931 BC', chapters:24, theme:'David: triumph and failure', keyVerse:'2 Samuel 7:16', summary:'David reigns over a united Israel, receives the covenant promise of an eternal throne, then falls and faces devastating consequences.' },
  { name:'1 Kings', testament:'OT', category:'History', author:'Unknown (Jeremiah?)', date:'~550 BC', chapters:22, theme:'The glory and the fracture', keyVerse:'1 Kings 18:21', summary:'Solomon builds the Temple in glory, then the kingdom tears apart over idolatry — a warning about what happens when you drift from God.' },
  { name:'2 Kings', testament:'OT', category:'History', author:'Unknown (Jeremiah?)', date:'~550 BC', chapters:25, theme:'The fall of Israel and Judah', keyVerse:'2 Kings 17:18', summary:'Both kingdoms eventually fall — Israel to Assyria, Judah to Babylon — exactly as God warned through the prophets.' },
  { name:'1 Chronicles', testament:'OT', category:'History', author:'Ezra', date:'~450–430 BC', chapters:29, theme:'The Davidic covenant', keyVerse:'1 Chronicles 29:11', summary:'Israel\'s history retold from a priestly perspective, focusing on David\'s preparations for the Temple and worship.' },
  { name:'2 Chronicles', testament:'OT', category:'History', author:'Ezra', date:'~450–430 BC', chapters:36, theme:'Faithfulness leads to blessing', keyVerse:'2 Chronicles 7:14', summary:'The kings of Judah are evaluated by one standard: did they seek God? The answer determines the nation\'s fate.' },
  { name:'Ezra', testament:'OT', category:'History', author:'Ezra', date:'~457 BC', chapters:10, theme:'Return and restoration', keyVerse:'Ezra 7:10', summary:'After 70 years in exile, God brings His people home to rebuild the Temple and renew their commitment to His word.' },
  { name:'Nehemiah', testament:'OT', category:'History', author:'Nehemiah', date:'~445–420 BC', chapters:13, theme:'Rebuilding what matters', keyVerse:'Nehemiah 8:10', summary:'Nehemiah leads the rebuilding of Jerusalem\'s walls against opposition — a model of prayer, leadership, and perseverance.' },
  { name:'Esther', testament:'OT', category:'History', author:'Unknown', date:'~479 BC', chapters:10, theme:'God\'s hidden providence', keyVerse:'Esther 4:14', summary:'God\'s name never appears, but His hand is everywhere — protecting His people through a young queen\'s courage.' },
  // ── Poetry ──
  { name:'Job', testament:'OT', category:'Poetry', author:'Unknown', date:'Unknown (possibly oldest book)', chapters:42, theme:'Suffering and sovereignty', keyVerse:'Job 19:25', summary:'A righteous man loses everything and wrestles with God — and God answers not with explanations but with His own overwhelming presence.' },
  { name:'Psalms', testament:'OT', category:'Poetry', author:'David and others', date:'~1400–400 BC', chapters:150, theme:'The full range of the human heart before God', keyVerse:'Psalm 23:1', summary:'150 songs of worship, lament, praise, and confession — the prayer book of Israel and the honest voice of every soul.' },
  { name:'Proverbs', testament:'OT', category:'Poetry', author:'Solomon and others', date:'~950 BC', chapters:31, theme:'The wisdom of God applied to everyday life', keyVerse:'Proverbs 3:5-6', summary:'Practical wisdom for living well — how to handle money, words, relationships, and work in ways that honor God.' },
  { name:'Ecclesiastes', testament:'OT', category:'Poetry', author:'Solomon', date:'~935 BC', chapters:12, theme:'Life without God is emptiness', keyVerse:'Ecclesiastes 12:13', summary:'Solomon examines everything life can offer — wealth, pleasure, wisdom — and concludes that apart from God, all of it is vapor.' },
  { name:'Song of Solomon', testament:'OT', category:'Poetry', author:'Solomon', date:'~965 BC', chapters:8, theme:'Love, marriage, and desire', keyVerse:'Song of Solomon 8:6', summary:'A stunning love poem celebrating marriage — and a picture of the deep love between God and His people.' },
  // ── Major Prophets ──
  { name:'Isaiah', testament:'OT', category:'Major Prophets', author:'Isaiah', date:'~700–681 BC', chapters:66, theme:'Judgment and the coming Servant-King', keyVerse:'Isaiah 53:5', summary:'The most Christ-centered book of the Old Testament — Isaiah sees the suffering servant who will bear the sins of the world.' },
  { name:'Jeremiah', testament:'OT', category:'Major Prophets', author:'Jeremiah', date:'~627–585 BC', chapters:52, theme:'The cost of faithfulness', keyVerse:'Jeremiah 29:11', summary:'The weeping prophet preaches an unpopular message for 40 years, promises a new covenant, and watches Jerusalem fall.' },
  { name:'Lamentations', testament:'OT', category:'Major Prophets', author:'Jeremiah', date:'~586 BC', chapters:5, theme:'Grief and hope in ruins', keyVerse:'Lamentations 3:22-23', summary:'Jerusalem has fallen. Jeremiah weeps over the rubble — and in the middle of total devastation, finds that God\'s mercies are new every morning.' },
  { name:'Ezekiel', testament:'OT', category:'Major Prophets', author:'Ezekiel', date:'~593–571 BC', chapters:48, theme:'God\'s glory departs and returns', keyVerse:'Ezekiel 36:26', summary:'A prophet in exile sees visions of God\'s holiness, Israel\'s sin, future restoration, and the valley of dry bones coming to life.' },
  { name:'Daniel', testament:'OT', category:'Major Prophets', author:'Daniel', date:'~605–530 BC', chapters:12, theme:'God rules over every kingdom', keyVerse:'Daniel 2:44', summary:'A young Israelite in Babylon refuses to compromise, survives lions, and receives visions of history\'s end — when God\'s eternal kingdom arrives.' },
  // ── Minor Prophets ──
  { name:'Hosea', testament:'OT', category:'Minor Prophets', author:'Hosea', date:'~755–715 BC', chapters:14, theme:'God\'s relentless love', keyVerse:'Hosea 6:6', summary:'Hosea is told to marry an unfaithful woman — and then keep loving her — as a living picture of God\'s love for wayward Israel.' },
  { name:'Joel', testament:'OT', category:'Minor Prophets', author:'Joel', date:'~835–796 BC', chapters:3, theme:'The Day of the Lord', keyVerse:'Joel 2:28', summary:'A locust plague becomes a warning of greater judgment — and a promise that God will pour out His Spirit on all flesh.' },
  { name:'Amos', testament:'OT', category:'Minor Prophets', author:'Amos', date:'~760–750 BC', chapters:9, theme:'Justice and the poor', keyVerse:'Amos 5:24', summary:'A shepherd confronts Israel\'s wealthy elite: worship without justice is worthless. Let justice roll like a river.' },
  { name:'Obadiah', testament:'OT', category:'Minor Prophets', author:'Obadiah', date:'~586 BC', chapters:1, theme:'Pride goes before destruction', keyVerse:'Obadiah 1:15', summary:'The shortest book in the Old Testament — a single chapter warning Edom that gloating over Israel\'s fall will bring their own.' },
  { name:'Jonah', testament:'OT', category:'Minor Prophets', author:'Jonah', date:'~785–760 BC', chapters:4, theme:'God\'s mercy reaches every nation', keyVerse:'Jonah 4:11', summary:'A prophet runs from God, gets swallowed by a fish, and discovers that God\'s grace extends even to Israel\'s enemies — which enrages him.' },
  { name:'Micah', testament:'OT', category:'Minor Prophets', author:'Micah', date:'~735–700 BC', chapters:7, theme:'Justice, mercy, and humility', keyVerse:'Micah 6:8', summary:'Micah predicts both judgment and hope — and names the very town where the Messiah will be born: Bethlehem.' },
  { name:'Nahum', testament:'OT', category:'Minor Prophets', author:'Nahum', date:'~663–612 BC', chapters:3, theme:'The justice of God', keyVerse:'Nahum 1:7', summary:'A century after Jonah, Nineveh has returned to evil — Nahum announces its complete destruction. God is patient, but not forever.' },
  { name:'Habakkuk', testament:'OT', category:'Minor Prophets', author:'Habakkuk', date:'~609–605 BC', chapters:3, theme:'Faith in the darkness', keyVerse:'Habakkuk 2:4', summary:'The prophet argues with God about why evil prospers — and ends in one of Scripture\'s greatest acts of trust despite unanswered questions.' },
  { name:'Zephaniah', testament:'OT', category:'Minor Prophets', author:'Zephaniah', date:'~640–621 BC', chapters:3, theme:'The great Day of the Lord', keyVerse:'Zephaniah 3:17', summary:'Warning of coming judgment gives way to one of the most tender verses in all Scripture — God rejoicing over His people with singing.' },
  { name:'Haggai', testament:'OT', category:'Minor Prophets', author:'Haggai', date:'~520 BC', chapters:2, theme:'Put God first', keyVerse:'Haggai 1:7', summary:'The returning exiles have built their own houses but left God\'s Temple in ruins. Haggai calls them to reorder their priorities.' },
  { name:'Zechariah', testament:'OT', category:'Minor Prophets', author:'Zechariah', date:'~520–480 BC', chapters:14, theme:'The coming King and Messiah', keyVerse:'Zechariah 9:9', summary:'Eight visions and clear prophecies of the Messiah — riding on a donkey, pierced, and returning as King over all the earth.' },
  { name:'Malachi', testament:'OT', category:'Minor Prophets', author:'Malachi', date:'~430 BC', chapters:4, theme:'The last word before 400 years of silence', keyVerse:'Malachi 3:1', summary:'The final book of the Old Testament — God calls His people back to faithfulness and promises a messenger is coming before the great day arrives.' },
  // ── Gospels ──
  { name:'Matthew', testament:'NT', category:'Gospels', author:'Matthew (Levi)', date:'~50–70 AD', chapters:28, theme:'Jesus the King of kings', keyVerse:'Matthew 28:18-20', summary:'Written to Jewish readers, Matthew shows how Jesus fulfills every Old Testament prophecy — the Lion of Judah has come.' },
  { name:'Mark', testament:'NT', category:'Gospels', author:'John Mark', date:'~50–60 AD', chapters:16, theme:'Jesus the Servant who acts', keyVerse:'Mark 10:45', summary:'The fastest-moving Gospel — Mark shows Jesus as a man of power and action, constantly moving to heal, teach, and save.' },
  { name:'Luke', testament:'NT', category:'Gospels', author:'Luke', date:'~60 AD', chapters:24, theme:'Jesus the Savior of all people', keyVerse:'Luke 19:10', summary:'A physician\'s careful account of Jesus\' life, emphasizing His compassion for outcasts, women, the poor, and sinners.' },
  { name:'John', testament:'NT', category:'Gospels', author:'John the Apostle', date:'~85–90 AD', chapters:21, theme:'Jesus is God in flesh', keyVerse:'John 3:16', summary:'Not biography but testimony — John selects seven miracles and seven "I am" statements to prove that Jesus is the eternal Son of God.' },
  // ── Acts ──
  { name:'Acts', testament:'NT', category:'History', author:'Luke', date:'~62 AD', chapters:28, theme:'The Holy Spirit building the church', keyVerse:'Acts 1:8', summary:'The story picks up after the resurrection — the Spirit falls at Pentecost and the Gospel explodes from Jerusalem to Rome.' },
  // ── Paul's Letters ──
  { name:'Romans', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~57 AD', chapters:16, theme:'The righteousness of God by faith', keyVerse:'Romans 8:1', summary:'Paul\'s greatest theological letter — a systematic explanation of the Gospel, sin, grace, justification, and life in the Spirit.' },
  { name:'1 Corinthians', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~55 AD', chapters:16, theme:'A divided church corrected by love', keyVerse:'1 Corinthians 13:13', summary:'Paul addresses a messy church full of division, immorality, and confusion about spiritual gifts — and anchors everything in love and the resurrection.' },
  { name:'2 Corinthians', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~56 AD', chapters:13, theme:'Strength through weakness', keyVerse:'2 Corinthians 12:9', summary:'Paul\'s most personal letter — he defends his ministry, shares his suffering, and shows that God\'s power shines brightest through broken vessels.' },
  { name:'Galatians', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~49 AD', chapters:6, theme:'Freedom from the law', keyVerse:'Galatians 2:20', summary:'A passionate letter defending grace — the Gospel cannot be mixed with law-keeping. We are justified by faith alone, not works.' },
  { name:'Ephesians', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~60–62 AD', chapters:6, theme:'The church as the body of Christ', keyVerse:'Ephesians 2:8-9', summary:'Paul soars into the heights of salvation and then descends to practical Christian living — the riches of grace and the armor of God.' },
  { name:'Philippians', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~61 AD', chapters:4, theme:'Joy in every circumstance', keyVerse:'Philippians 4:13', summary:'Written from prison, this is Paul\'s happiest letter — joy appears in every chapter because it is not based on circumstances but on Christ.' },
  { name:'Colossians', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~60–62 AD', chapters:4, theme:'Christ is supreme over everything', keyVerse:'Colossians 1:17', summary:'Against false teaching that diminishes Jesus, Paul declares Christ is the image of the invisible God, holding all things together.' },
  { name:'1 Thessalonians', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~51 AD', chapters:5, theme:'Living in light of Christ\'s return', keyVerse:'1 Thessalonians 5:16-18', summary:'Paul\'s earliest letter — encouraging a young church under persecution to live holy lives as they wait for Jesus to return.' },
  { name:'2 Thessalonians', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~51–52 AD', chapters:3, theme:'Don\'t be idle; the end is coming', keyVerse:'2 Thessalonians 3:3', summary:'Paul corrects confusion about the Second Coming and calls the church to stay faithful and productive while waiting.' },
  { name:'1 Timothy', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~62–64 AD', chapters:6, theme:'How to lead the church', keyVerse:'1 Timothy 4:12', summary:'A mentor\'s letter to a young pastor — covering church leadership, sound doctrine, prayer, and how to handle difficult people.' },
  { name:'2 Timothy', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~67 AD', chapters:4, theme:'Finish strong', keyVerse:'2 Timothy 4:7', summary:'Paul\'s final letter, written from death row — a charge to a younger leader to preach the Word no matter what, because the time is coming.' },
  { name:'Titus', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~63–65 AD', chapters:3, theme:'Good doctrine produces good lives', keyVerse:'Titus 2:11-12', summary:'Instructions to a pastor on Crete — healthy churches are built on sound teaching that transforms how people actually live.' },
  { name:'Philemon', testament:'NT', category:"Paul's Letters", author:'Paul', date:'~60–62 AD', chapters:1, theme:'Forgiveness and reconciliation', keyVerse:'Philemon 1:16', summary:'The shortest of Paul\'s letters — a personal appeal to accept back a runaway slave as a brother in Christ, not a piece of property.' },
  // ── General Letters ──
  { name:'Hebrews', testament:'NT', category:'General Letters', author:'Unknown (possibly Paul or Apollos)', date:'~67–69 AD', chapters:13, theme:'Jesus is better than everything', keyVerse:'Hebrews 12:1-2', summary:'A masterful argument that Jesus fulfills and surpasses every element of the Old Testament — better priest, better sacrifice, better covenant.' },
  { name:'James', testament:'NT', category:'General Letters', author:'James (brother of Jesus)', date:'~45–49 AD', chapters:5, theme:'Real faith produces real works', keyVerse:'James 2:17', summary:'The most practical letter in the New Testament — faith that doesn\'t change how you live isn\'t really faith at all.' },
  { name:'1 Peter', testament:'NT', category:'General Letters', author:'Peter', date:'~62–64 AD', chapters:5, theme:'Holiness in the face of suffering', keyVerse:'1 Peter 5:7', summary:'Written to scattered, persecuted Christians — Peter calls them to live as strangers in a foreign land, anchored by an imperishable hope.' },
  { name:'2 Peter', testament:'NT', category:'General Letters', author:'Peter', date:'~65–68 AD', chapters:3, theme:'Watch out for false teaching', keyVerse:'2 Peter 1:21', summary:'Peter\'s farewell letter warns against false prophets who twist grace into a license for sin, and urges believers to grow in knowledge.' },
  { name:'1 John', testament:'NT', category:'General Letters', author:'John the Apostle', date:'~90–95 AD', chapters:5, theme:'God is love', keyVerse:'1 John 4:8', summary:'John writes to assure genuine believers and expose counterfeits — the test: does your life show love for God and love for people?' },
  { name:'2 John', testament:'NT', category:'General Letters', author:'John the Apostle', date:'~90–95 AD', chapters:1, theme:'Walk in truth and love', keyVerse:'2 John 1:6', summary:'A brief letter warning against welcoming teachers who deny the Incarnation — truth and love must go together.' },
  { name:'3 John', testament:'NT', category:'General Letters', author:'John the Apostle', date:'~90–95 AD', chapters:1, theme:'Support those who serve truth', keyVerse:'3 John 1:4', summary:'A personal note commending Gaius for his hospitality and calling out Diotrephes who loves the limelight over faithful brothers.' },
  { name:'Jude', testament:'NT', category:'General Letters', author:'Jude (brother of Jesus)', date:'~65 AD', chapters:1, theme:'Contend for the faith', keyVerse:'Jude 1:3', summary:'A fierce one-chapter letter urging believers to fight for the faith against ungodly teachers who have crept into the church.' },
  // ── Prophecy ──
  { name:'Revelation', testament:'NT', category:'Prophecy', author:'John the Apostle', date:'~95 AD', chapters:22, theme:'Jesus wins', keyVerse:'Revelation 21:4', summary:'The final vision of history — tribulation, judgment, and the triumphant return of the Lamb, who makes all things new forever.' },
];

type TabId = 'terms' | 'names' | 'words' | 'religions' | 'books';

export default function TermsReference({ accentColor, selectedBibleAbbr = 'KJV', hideReligions, religionsOnly }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(religionsOnly ? 'religions' : 'terms');
  const [letterFilter, setLetterFilter] = useState<string>('');
  const [aiTermResult, setAiTermResult] = useState('');
  const [aiTermLoading, setAiTermLoading] = useState(false);
  const [aiTermQuery, setAiTermQuery] = useState('');
  const [termFilter, setTermFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReligion, setSelectedReligion] = useState<string | null>(null);
  const [religionSearch, setReligionSearch] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [commonGroundMode, setCommonGroundMode] = useState(false);
  const [timelineMode, setTimelineMode] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [bookSearch, setBookSearch] = useState('');
  const [bookTestament, setBookTestament] = useState<'All' | 'OT' | 'NT'>('All');
  const [bookCategory, setBookCategory] = useState('All');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);

  const termCategories = ['All', ...Array.from(new Set(TERMS.map(t => t.category)))];
  const filteredTerms = TERMS.filter(t => {
    const matchCat = termFilter === 'All' || t.category === termFilter;
    const matchSearch = !searchTerm || t.term.toLowerCase().includes(searchTerm.toLowerCase()) || t.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLetter = !letterFilter || t.term[0].toUpperCase() === letterFilter;
    return matchCat && matchSearch && matchLetter;
  });

  // AI lookup for terms not in the list
  const handleTermSearch = async (query: string) => {
    if (!query.trim()) return;
    // Check if the term exists
    const exists = TERMS.some(t => t.term.toLowerCase() === query.toLowerCase());
    if (exists) return; // already showing it
    setAiTermQuery(query);
    setAiTermResult('');
    setAiTermLoading(true);
    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: 'Biblical Term',
          verseText: query,
          translation: selectedBibleAbbr,
          question: `Define the biblical/theological term "${query}". Include:
1. A clear definition (2-3 sentences)
2. The original Hebrew or Greek word if applicable
3. 2-3 key Scripture references where this concept appears
4. Why it matters for understanding the Bible

Keep it warm, clear, and pastoral. No markdown or asterisks.`,
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiTermResult(text);
      }
    } catch {
      setAiTermResult('Could not look up this term. Check your connection.');
    } finally {
      setAiTermLoading(false);
    }
  };

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="space-y-3">
      {/* Tab toggle */}
      {!religionsOnly && (
        <div className="flex gap-1 rounded-xl p-1" style={{ background: `${accentColor}0a`, border: `1px solid ${accentColor}15` }}>
          {([
            { id: 'terms' as TabId, label: 'Terms', icon: '📖' },
            { id: 'names' as TabId, label: 'Names of God', icon: '👑' },
            { id: 'books' as TabId, label: 'Books', icon: '📚' },
            { id: 'words' as TabId, label: 'Word Study', icon: '📝' },
          ] as { id: TabId; label: string; icon: string }[]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all"
              style={activeTab === t.id
                ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 8px ${accentColor}33` }
                : { color: `${accentColor}55` }}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Biblical Terms ────────────────────────────────────────── */}
      {activeTab === 'terms' && (
        <>
          {/* Search with AI fallback */}
          <div className="flex gap-2">
            <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setAiTermResult(''); setAiTermQuery(''); }}
              placeholder="Search terms…"
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }}
              onKeyDown={e => { if (e.key === 'Enter') handleTermSearch(searchTerm); }} />
            {searchTerm && filteredTerms.length === 0 && (
              <button onClick={() => handleTermSearch(searchTerm)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold shrink-0"
                style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}33` }}>
                AI Lookup
              </button>
            )}
          </div>

          {/* A-Z filter */}
          <div className="flex flex-wrap gap-1 justify-center">
            <button onClick={() => setLetterFilter('')}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
              style={!letterFilter
                ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }
                : { background: `${accentColor}08`, color: 'rgba(232,240,236,0.3)' }}>
              All
            </button>
            {ALPHABET.map(letter => {
              const hasTerms = TERMS.some(t => t.term[0].toUpperCase() === letter);
              return (
                <button key={letter} onClick={() => setLetterFilter(letterFilter === letter ? '' : letter)}
                  disabled={!hasTerms}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
                  style={letterFilter === letter
                    ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }
                    : hasTerms
                      ? { background: `${accentColor}08`, color: 'rgba(232,240,236,0.4)' }
                      : { background: 'transparent', color: 'rgba(232,240,236,0.1)', cursor: 'default' }}>
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {termCategories.map(cat => (
              <button key={cat} onClick={() => setTermFilter(cat)}
                className="px-4 py-2 rounded-full text-xs font-extrabold tracking-wide whitespace-nowrap transition-all shrink-0"
                style={termFilter === cat
                  ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 10px ${accentColor}40`, border: `1.5px solid ${accentColor}` }
                  : { background: `${accentColor}0a`, color: 'rgba(232,240,236,0.45)', border: `1.5px solid ${accentColor}18` }}>
                {cat}
              </button>
            ))}
          </div>

          {/* AI result for unknown terms */}
          {(aiTermResult || aiTermLoading) && (
            <div className="rounded-xl p-4" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}18` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">✦</span>
                <h3 className="text-sm font-black" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                  {aiTermQuery}
                </h3>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${accentColor}18`, color: `${accentColor}aa` }}>AI</span>
              </div>
              {aiTermLoading && !aiTermResult && (
                <div className="flex items-center gap-2 py-4">
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                  <span className="text-xs" style={{ color: 'rgba(232,240,236,0.35)' }}>Looking up this term…</span>
                </div>
              )}
              {aiTermResult && (
                <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(232,240,236,0.6)', fontFamily: 'Georgia, serif' }}>
                  {cleanMarkdown(aiTermResult)}
                  {aiTermLoading && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: accentColor, borderRadius: 1 }} />}
                </div>
              )}
            </div>
          )}

          {/* Term cards */}
          {letterFilter && <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${accentColor}55` }}>{letterFilter} · {filteredTerms.length} terms</p>}
          <div className="grid grid-cols-2 gap-2">
            {filteredTerms.map(t => (
              <div key={t.term} className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}12` }}>
                <h3 className="text-xs font-black mb-0.5" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{t.term}</h3>
                {(t.greek || t.hebrew) && (
                  <p className="text-[9px] mb-1" style={{ color: `${accentColor}55` }}>
                    {t.hebrew && <em>{t.hebrew}</em>}
                    {t.hebrew && t.greek && ' · '}
                    {t.greek && <em>{t.greek}</em>}
                  </p>
                )}
                <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: 'rgba(232,240,236,0.5)', fontFamily: 'Georgia, serif' }}>
                  {t.definition.length > 80 ? t.definition.slice(0, 80) + '...' : t.definition}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${accentColor}0d`, color: `${accentColor}66` }}>{t.keyVerse}</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${accentColor}0a`, color: `${accentColor}44` }}>{t.category}</span>
                </div>
              </div>
            ))}
          </div>

          {/* No results + AI prompt */}
          {filteredTerms.length === 0 && !aiTermResult && !aiTermLoading && searchTerm && (
            <div className="text-center py-6">
              <p className="text-sm mb-3" style={{ color: 'rgba(232,240,236,0.4)' }}>No term found for &ldquo;{searchTerm}&rdquo;</p>
              <button onClick={() => handleTermSearch(searchTerm)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
                style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}33` }}>
                ✦ Look it up with AI
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Names of God ──────────────────────────────────────────── */}
      {activeTab === 'names' && (
        <div className="grid grid-cols-2 gap-2">
          {GOD_NAMES.map(n => (
            <div key={n.hebrew} className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}12` }}>
              <p className="text-base font-bold mb-0.5" style={{ color: accentColor, fontFamily: 'Georgia, serif' }}>{n.hebrew}</p>
              <p className="text-[10px] font-bold mb-1" style={{ color: 'rgba(232,240,236,0.7)' }}>{n.english}</p>
              <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: 'rgba(232,240,236,0.45)', fontFamily: 'Georgia, serif' }}>{n.meaning}</p>
              {n.verse && (
                <p className="text-[9px] italic leading-relaxed mb-1.5 pl-2" style={{ color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif', borderLeft: `2px solid ${accentColor}22` }}>
                  &ldquo;{n.verse}&rdquo;
                </p>
              )}
              <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${accentColor}14`, color: `${accentColor}88` }}>{n.ref}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Books of the Bible ────────────────────────────────────── */}
      {activeTab === 'books' && (() => {
        const categories = ['All', ...Array.from(new Set(BIBLE_BOOKS.map(b => b.category)))];
        const filtered = BIBLE_BOOKS.filter(b => {
          const matchT = bookTestament === 'All' || b.testament === bookTestament;
          const matchC = bookCategory === 'All' || b.category === bookCategory;
          const matchS = !bookSearch || b.name.toLowerCase().includes(bookSearch.toLowerCase()) || b.theme.toLowerCase().includes(bookSearch.toLowerCase());
          return matchT && matchC && matchS;
        });

        if (selectedBook) {
          const fadeIdx = BIBLE_BOOKS.indexOf(selectedBook);
          const bookColor = tileFadeColor(fadeIdx, BIBLE_BOOKS.length);
          return (
            <div className="space-y-3">
              <button onClick={() => setSelectedBook(null)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl active:scale-95 transition-all"
                style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}28` }}>
                <span className="text-base leading-none" style={{ color: accentColor }}>←</span>
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: accentColor }}>Back</span>
              </button>

              <div className="rounded-3xl overflow-hidden" style={{ border: `1px solid ${bookColor}30` }}>
                {/* Header */}
                <div className="relative px-5 pt-6 pb-5 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${bookColor}18 0%, ${bookColor}06 100%)` }}>
                  <div className="h-0.5 w-full absolute top-0 left-0" style={{ background: `linear-gradient(90deg, ${bookColor}cc, transparent)` }} />
                  <div className="absolute -right-2 -bottom-3 font-black select-none pointer-events-none"
                    style={{ fontSize: 72, color: `${bookColor}09`, fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-3px', lineHeight: 1 }}>
                    {selectedBook.name[0]}
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: `${bookColor}80` }}>
                    {selectedBook.testament === 'OT' ? 'Old Testament' : 'New Testament'} · {selectedBook.category}
                  </p>
                  <h2 className="text-2xl font-black leading-tight mb-1" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.03em' }}>
                    {selectedBook.name}
                  </h2>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(232,240,236,0.75)' }}>
                    {selectedBook.author} · {selectedBook.date} · {selectedBook.chapters} chapters
                  </p>
                </div>

                <div className="px-5 py-5 space-y-4">
                  {/* Summary */}
                  <p className="text-sm leading-[1.85]" style={{ color: 'rgba(232,240,236,0.92)', fontFamily: 'Georgia, serif' }}>
                    {selectedBook.summary}
                  </p>

                  <div className="h-px" style={{ background: `linear-gradient(90deg, ${bookColor}25, transparent)` }} />

                  {/* Theme */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: bookColor }}>Theme</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.90)', fontFamily: 'Georgia, serif' }}>{selectedBook.theme}</p>
                  </div>

                  {/* Key Verse */}
                  <div className="rounded-2xl px-4 py-3.5" style={{ background: `${bookColor}10`, border: `1px solid ${bookColor}28` }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: bookColor }}>Key Verse</p>
                    <p className="text-sm font-bold" style={{ color: '#f0f8f4', fontFamily: 'Georgia, serif' }}>{selectedBook.keyVerse}</p>
                  </div>

                  {/* Meta pills */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: selectedBook.testament === 'OT' ? 'Old Testament' : 'New Testament' },
                      { label: selectedBook.category },
                      { label: `${selectedBook.chapters} chapters` },
                    ].map(p => (
                      <span key={p.label} className="text-[10px] px-3 py-1 rounded-full font-bold"
                        style={{ background: `${bookColor}12`, border: `1px solid ${bookColor}25`, color: `${bookColor}cc` }}>
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {/* Search */}
            <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={bookSearch} onChange={e => setBookSearch(e.target.value)}
              placeholder="Search books or themes…"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />

            {/* OT / NT filter */}
            <div className="flex gap-1.5">
              {(['All', 'OT', 'NT'] as const).map(t => (
                <button key={t} onClick={() => setBookTestament(t)}
                  className="flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                  style={bookTestament === t
                    ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 10px ${accentColor}33` }
                    : { background: `${accentColor}0a`, border: `1px solid ${accentColor}18`, color: `${accentColor}66` }}>
                  {t === 'All' ? 'All 66' : t === 'OT' ? 'Old · 39' : 'New · 27'}
                </button>
              ))}
            </div>

            {/* Category pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(c => (
                <button key={c} onClick={() => setBookCategory(c)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all"
                  style={bookCategory === c
                    ? { background: accentColor, color: '#fff' }
                    : { background: `${accentColor}0a`, border: `1px solid ${accentColor}18`, color: `${accentColor}66` }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Book grid */}
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((book, idx) => {
                const allFiltered = BIBLE_BOOKS.filter(b => {
                  const matchT = bookTestament === 'All' || b.testament === bookTestament;
                  const matchC = bookCategory === 'All' || b.category === bookCategory;
                  return matchT && matchC;
                });
                const globalIdx = BIBLE_BOOKS.indexOf(book);
                const fadeColor = tileFadeColor(globalIdx, BIBLE_BOOKS.length);
                return (
                  <button key={book.name} onClick={() => setSelectedBook(book)}
                    className="text-left rounded-2xl overflow-hidden active:scale-[0.97] transition-all relative"
                    style={{
                      background: `linear-gradient(180deg, ${accentColor}10 0%, ${fadeColor}18 100%)`,
                      border: `1px solid ${fadeColor}22`,
                    }}>
                    <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}99, ${fadeColor}55)` }} />
                    <div className="relative px-3 pt-3 pb-3 overflow-hidden">
                      <div className="absolute -bottom-1 -right-1 font-black select-none pointer-events-none leading-none"
                        style={{ fontSize: 40, color: `${fadeColor}12`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                        {book.name[0]}
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-[0.15em] mb-1" style={{ color: `${fadeColor}80` }}>
                        {book.testament} · {book.category}
                      </p>
                      <p className="text-xs font-black leading-tight mb-1" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.01em' }}>
                        {book.name}
                      </p>
                      <p className="text-[9px] leading-snug pr-4" style={{ color: 'rgba(232,240,236,0.60)' }}>
                        {book.chapters} ch · {book.author.split(' ')[0]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <p className="text-center text-xs py-6" style={{ color: `${accentColor}44` }}>No books match your search.</p>
            )}
          </div>
        );
      })()}

      {/* ── Word Study ────────────────────────────────────────────── */}
      {activeTab === 'words' && (
        <WordStudy accentColor={accentColor} selectedBibleAbbr={selectedBibleAbbr} />
      )}

      {/* ── World Religions ───────────────────────────────────────── */}
      {(activeTab === 'religions' || religionsOnly) && (() => {
        const selected = RELIGIONS.find(r => r.name === selectedReligion);
        const filtered = RELIGIONS.filter(r =>
          !religionSearch || r.name.toLowerCase().includes(religionSearch.toLowerCase())
        );

        // Detail view for a selected religion
        if (selected && !compareMode) {
          return (
            <div className="space-y-3">
              <button onClick={() => setSelectedReligion(null)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl active:scale-95 transition-all"
                style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}28` }}>
                <span className="text-base leading-none" style={{ color: accentColor }}>←</span>
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: accentColor }}>Back</span>
              </button>

              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}25` }}>
                {/* Header */}
                <div className="px-5 pt-5 pb-4 text-center" style={{ background: `${accentColor}10`, borderBottom: `1px solid ${accentColor}20` }}>
                  <h2 className="font-black uppercase tracking-[0.08em]" style={{ fontSize: 20, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{selected.name}</h2>
                  <p className="text-xs mt-1" style={{ color: 'rgba(232,240,236,0.75)' }}>{selected.founded} · {selected.followers}</p>
                </div>

                {/* Key Differences — at top */}
                <div className="px-5 pt-5">
                  <div className="rounded-xl p-4" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
                    <p className="text-xs font-black uppercase tracking-[0.12em] mb-3" style={{ color: '#fb923c', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Key Differences from Christianity</p>
                    <div className="space-y-2.5">
                      {selected.keyDifferences.map((d, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-left">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(251,146,60,0.18)', color: '#fb923c', fontSize: 10, fontWeight: 800 }}>{i + 1}</div>
                          <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.9)', fontFamily: 'Georgia, serif' }}>{d}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-5 space-y-4">
                  {/* Core beliefs as pills */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: accentColor }}>Core Beliefs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.keyBeliefs.map((b, i) => (
                        <span key={i} className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30`, color: '#f0f8f4' }}>{b}</span>
                      ))}
                    </div>
                  </div>

                  {/* Info grid */}
                  {([
                    { label: 'Scripture', value: selected.scripture },
                    { label: 'View of God', value: selected.godView },
                    { label: 'Path to Salvation', value: selected.salvation },
                  ]).map(item => (
                    <div key={item.label}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>{item.label}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.9)', fontFamily: 'Georgia, serif' }}>{item.value}</p>
                    </div>
                  ))}

                  {/* Connection to Christianity */}
                  <div className="rounded-xl p-4" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}25` }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: accentColor }}>Connection to Christianity</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.9)', fontFamily: 'Georgia, serif' }}>{selected.connectionToChristianity}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Browse / Compare view
        return (
          <div className="space-y-3">
            {/* Search */}
            <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={religionSearch} onChange={e => setReligionSearch(e.target.value)}
              placeholder="Search religions & denominations…"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />

            {/* Action row: Compare · Common Ground · Timeline */}
            <div className="flex gap-1.5">
              {([
                { key: 'compare',      label: 'Compare',  icon: '⚖',  active: compareMode },
                { key: 'ground',       label: 'Common',   icon: '🌐', active: commonGroundMode },
                { key: 'timeline',     label: 'Timeline', icon: '🌳', active: timelineMode },
              ] as { key: string; label: string; icon: string; active: boolean }[]).map(btn => (
                <button key={btn.key}
                  onClick={() => {
                    const next = !btn.active;
                    setCompareMode(btn.key === 'compare' ? next : false);
                    setCommonGroundMode(btn.key === 'ground' ? next : false);
                    setTimelineMode(btn.key === 'timeline' ? next : false);
                    if (btn.key === 'compare') { setCompareA(''); setCompareB(''); }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
                  style={btn.active
                    ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 10px ${accentColor}33` }
                    : { background: `${accentColor}0a`, border: `1px solid ${accentColor}18`, color: `${accentColor}88` }}>
                  <span>{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Common Ground — Deep Connections */}
            {commonGroundMode && (() => {
              const threads = [
                {
                  icon: '✦',
                  title: 'The Longing',
                  sub: 'Every civilization looks up',
                  body: 'Every civilization that has ever existed has looked up. From the cave paintings of Lascaux to the temples of Angkor Wat to a child\'s first prayer — the human heart has always sensed that this world is not all there is. No culture has ever been discovered without some form of worship. That longing is not an accident. It is a fingerprint.',
                  color: '#f59e0b',
                  pills: ['Christianity', 'Islam', 'Hinduism', 'Buddhism', 'Judaism', 'Taoism', 'Indigenous'],
                },
                {
                  icon: '⚡',
                  title: 'Something Is Wrong',
                  sub: 'Every religion begins with a diagnosis',
                  body: 'Every religion begins with a diagnosis: humanity is not the way it should be. Christians call it sin. Buddhists call it dukkha — suffering rooted in attachment. Hinduism speaks of maya, the illusion that clouds the soul. Islam teaches the forgetting of our covenant with God. The names differ, but the observation is universal: we are broken, lost, or asleep.',
                  color: '#ef4444',
                  pills: ['Christianity', 'Buddhism', 'Hinduism', 'Islam', 'Judaism', 'Zoroastrianism'],
                },
                {
                  icon: '→',
                  title: 'A Way Through',
                  sub: 'No religion stops at the wound',
                  body: 'Every tradition offers a path — a way back, a way up, a way through. The Torah gives Israel a covenant. The Eightfold Path gives Buddhists a road to enlightenment. The Five Pillars structure Muslim submission. The Tao is the harmony to return to. Human beings are not just diagnosed — they are given hope.',
                  color: '#34d399',
                  pills: ['Christianity', 'Islam', 'Buddhism', 'Judaism', 'Hinduism', 'Sikhism', 'Taoism'],
                },
                {
                  icon: '◎',
                  title: 'A Voice from Beyond',
                  sub: 'Someone who broke through',
                  body: 'Almost every religion has a figure who broke through — someone who carried something from the other side. Moses descended from Sinai. The Buddha sat under the Bodhi tree until the veil lifted. Muhammad received the Quran in a cave. Guru Nanak heard God\'s call in a river. Jesus walked out of a tomb. Humanity seems to know it needs a messenger.',
                  color: '#a78bfa',
                  pills: ['Christianity', 'Islam', 'Buddhism', 'Judaism', 'Sikhism', 'Bahá\'í'],
                },
                {
                  icon: '♡',
                  title: 'Love as the Highest Law',
                  sub: 'The one thing no tradition escapes',
                  body: '"Do unto others" appears in the Torah, the Sermon on the Mount, the Quran, the Analects of Confucius, the Hindu concept of ahimsa, and the Buddhist Metta Sutta. Humanity has never been able to shake the conviction that love — not power, not knowledge, not wealth — is the thing that matters most.',
                  color: '#f472b6',
                  pills: ['Christianity', 'Islam', 'Buddhism', 'Hinduism', 'Judaism', 'Confucianism', 'Sikhism'],
                },
                {
                  icon: '∞',
                  title: 'Death Is Not the End',
                  sub: 'No culture accepts death as final',
                  body: 'No human culture has ever fully accepted death as the last word. Christians await resurrection. Hindus and Buddhists believe in rebirth toward liberation. Muslims anticipate paradise. Zoroastrians see a final judgment and renewal. Indigenous traditions speak of ancestors who remain near. Something in us refuses to believe that love and personhood simply cease.',
                  color: '#60a5fa',
                  pills: ['Christianity', 'Islam', 'Hinduism', 'Buddhism', 'Judaism', 'Zoroastrianism'],
                },
                {
                  icon: '✦',
                  title: 'The Sacred Is Real',
                  sub: 'Some things are set apart',
                  body: 'Every religion marks certain moments, places, and acts as holy. The Temple in Jerusalem. The Ka\'ba in Mecca. The Ganges. The Bodhi Tree. Ramadan. Diwali. Sabbath. Human beings cannot live in a flat world. Something in us insists that not everything is equal — that some places are closer to heaven than others.',
                  color: accentColor,
                  pills: ['All major traditions', 'Indigenous religions'],
                },
              ];

              return (
                <div>
                  {/* Cinematic header */}
                  <div className="relative rounded-3xl overflow-hidden mb-4 px-6 py-7"
                    style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}06 50%, rgba(0,0,0,0) 100%)`, border: `1px solid ${accentColor}22` }}>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black select-none pointer-events-none"
                      style={{ fontSize: 80, lineHeight: 1, color: `${accentColor}07`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      ✦
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: `${accentColor}66` }}>What Every Religion Shares</p>
                    <h2 className="text-2xl font-black leading-none mb-2" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.03em' }}>
                      The Threads<br />That Bind Us.
                    </h2>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.45)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                      Seven instincts no culture has ever fully escaped.
                    </p>
                  </div>

                  {/* The Gospel Answer — top */}
                  <div className="relative rounded-3xl overflow-hidden mb-4"
                    style={{ background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}08 100%)`, border: `1px solid ${accentColor}35` }}>
                    <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}00)` }} />
                    <div className="px-5 py-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: `${accentColor}25`, border: `1px solid ${accentColor}50` }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: accentColor }}>The Gospel Answer</p>
                      </div>
                      <p className="text-sm font-black leading-tight mb-2" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.02em' }}>
                        Every religion is humanity reaching up.<br />The Gospel is God reaching down.
                      </p>
                      <p className="text-xs leading-[1.85]" style={{ color: 'rgba(232,240,236,0.65)', fontFamily: 'Georgia, serif' }}>
                        Every human heart already knows something is wrong, something is sacred, and love is what matters most. Christianity does not contradict those instincts — it says they were always pointing somewhere. To a manger. To a cross. To an empty tomb.
                      </p>
                      <div className="mt-3 rounded-2xl px-4 py-3" style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}25` }}>
                        <p className="text-xs leading-[1.85]" style={{ color: 'rgba(232,240,236,0.70)', fontFamily: 'Georgia, serif' }}>
                          Jesus sat with people others refused to acknowledge. He loved across every line — religion, ethnicity, reputation, past. Understanding where someone else is coming from is not compromise. It is exactly what He did. We study these traditions not to agree with everything in them, but to love the people inside them better.
                        </p>
                        <p className="text-[10px] font-bold mt-2 italic" style={{ color: `${accentColor}60`, fontFamily: 'Georgia, serif' }}>
                          "Love your neighbor as yourself." — Mark 12:31
                        </p>
                      </div>
                      <p className="text-[10px] font-bold mt-3 italic" style={{ color: `${accentColor}70`, fontFamily: 'Georgia, serif' }}>
                        "For God so loved the world that he gave his one and only Son." — John 3:16
                      </p>
                    </div>
                  </div>

                  {/* Thread cards — accordion */}
                  <div className="space-y-2.5">
                    {threads.map((t, i) => (
                      <button key={t.title}
                        onClick={() => setExpandedEvent(expandedEvent === i + 100 ? null : i + 100)}
                        className="w-full text-left rounded-3xl overflow-hidden transition-all active:scale-[0.98]"
                        style={{
                          background: `linear-gradient(145deg, ${t.color}12 0%, ${t.color}04 60%, rgba(0,0,0,0) 100%)`,
                          border: `1px solid ${expandedEvent === i + 100 ? t.color + '45' : t.color + '20'}`,
                          boxShadow: expandedEvent === i + 100 ? `0 4px 32px ${t.color}14` : 'none',
                        }}>
                        {/* Top accent bar */}
                        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${t.color}bb, ${t.color}00)` }} />

                        <div className="px-4 py-3">
                          {/* Header row */}
                          <div className="flex items-center gap-3">
                            {/* Icon orb */}
                            <div className="shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center text-base font-black"
                              style={{ background: `${t.color}15`, border: `1px solid ${t.color}28`, color: t.color, boxShadow: `0 0 16px ${t.color}18` }}>
                              {t.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black leading-tight" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.01em' }}>
                                {t.title}
                              </p>
                              <p className="text-[10px] font-semibold mt-0.5" style={{ color: `${t.color}90` }}>
                                {t.sub}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] transition-transform duration-200"
                              style={{ color: `${t.color}60`, transform: expandedEvent === i + 100 ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                              ▾
                            </span>
                          </div>

                          {/* Expanded */}
                          {expandedEvent === i + 100 && (
                            <div className="mt-3">
                              <div className="h-px mb-3" style={{ background: `linear-gradient(90deg, ${t.color}25, transparent)` }} />
                              <p className="text-xs leading-[1.9] mb-3" style={{ color: 'rgba(232,240,236,0.68)', fontFamily: 'Georgia, serif' }}>
                                {t.body}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {t.pills.map(p => (
                                  <span key={p} className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                                    style={{ background: `${t.color}12`, border: `1px solid ${t.color}28`, color: t.color }}>
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                </div>
              );
            })()}

            {/* Religion Timeline */}
            {timelineMode && (() => {
              const events = [
                {
                  era: 'The Beginning',
                  label: 'God Sets Eternity in Every Heart',
                  sub: 'Creation · The Fall · The Longing',
                  body: '"He has made everything beautiful in its time. He has also set eternity in the human heart." — Ecclesiastes 3:11. God created humanity in His image. Humanity rebelled. But the longing He placed inside us never left. This is why every civilization in every corner of the earth — independent of each other — developed religion. The searching was never random. God put it there.',
                  color: accentColor,
                  splits: [],
                  splitNote: '"For what can be known about God is plain to them, because God has shown it to them." — Romans 1:19',
                },
                {
                  era: '~2300–400 BC',
                  label: 'The Nations Search',
                  sub: 'Hinduism · Buddhism · Taoism · Confucianism · Zoroastrianism',
                  body: 'Across Asia and the Middle East, civilizations independently reach toward the divine — each from their own soil, with no contact with each other or with Israel. Paul writes in Acts 17 that God "determined the times and places where people should live, so that they might seek him and perhaps reach out and find him." These traditions represent humanity reaching up. What they share — a moral law, a sense of the sacred, a hunger for something beyond death — reflects the image of God still written on human hearts, however obscured.',
                  color: '#a78bfa',
                  splits: [
                    { name: 'Hinduism (~2300–1500 BC)', reason: 'The Rigveda is composed in northwestern India — independent of Abraham. One of the oldest living religious traditions. Teaches many gods expressing one ultimate reality (Brahman). Not Abrahamic in origin.', color: '#f59e0b' },
                    { name: 'Zoroastrianism (~1500–600 BC)', reason: 'Zoroaster in Persia teaches one good God (Ahura Mazda) against cosmic evil — independent of Israel. Its concepts of angels, Satan, heaven, hell, and bodily resurrection may have shaped Jewish thought during the Babylonian exile.', color: '#fb923c' },
                    { name: 'Buddhism (~500 BC)', reason: 'Siddhartha Gautama — a Hindu prince — rejects caste and the Vedic gods. Buddhism branches from Hinduism, not from Abraham. Teaches that suffering ends through detachment; no personal creator God at its center.', color: '#a78bfa' },
                    { name: 'Confucianism (~500 BC)', reason: 'Confucius in China builds an ethical system around family, duty, and social harmony — a moral philosophy more than a theology. No creator God, no salvation, no afterlife focus. Entirely independent.', color: '#f472b6' },
                    { name: 'Taoism (~400 BC)', reason: 'The Tao Te Ching emerges in China — teaching alignment with the natural flow of the universe (the Tao). No personal God, no revelation. Independent of Abraham and the Vedas.', color: '#34d399' },
                  ],
                  splitNote: 'Every tradition asks the right questions. Christianity claims God Himself is the answer.',
                },
                {
                  era: '~2000 BC',
                  label: 'God Initiates',
                  sub: 'Abraham · The Covenant · "All Nations Will Be Blessed"',
                  body: 'While the nations search, God does something different — He speaks first. He calls Abraham out of Ur and makes an unconditional covenant: "I will make you into a great nation... and all peoples on earth will be blessed through you" (Genesis 12:2–3). This is not humanity finding God. This is God choosing to be found — and planting, through one family, the seed that will become Jesus Christ.',
                  color: accentColor,
                  splits: [],
                  splitNote: '"The Scripture foresaw that God would justify the Gentiles by faith, and announced the gospel in advance to Abraham." — Galatians 3:8',
                },
                {
                  era: '~1300–400 BC',
                  label: 'The Law and the Prophets',
                  sub: 'Moses · The Torah · The Temple · Isaiah · Daniel',
                  body: 'God gives Israel the Law at Sinai — not to save them by rule-keeping, but to show them they cannot save themselves (Galatians 3:24). Every sacrifice, every feast, every drop of blood points forward. The prophets grow increasingly specific: a virgin will conceive (Isaiah 7:14), He will be born in Bethlehem (Micah 5:2), He will be pierced for our transgressions (Isaiah 53:5), He will rise from the dead (Psalm 16:10). The entire Old Testament is a long preparation for one moment.',
                  color: '#60a5fa',
                  splits: [
                    { name: 'Judaism', reason: 'The covenant people — given the Law, the Temple, the Prophets, and the promise of Messiah. Every element of Israel\'s worship was a shadow of the substance to come (Colossians 2:17).', color: '#60a5fa' },
                  ],
                  splitNote: '"The law was our guardian until Christ came, so that we might be justified by faith." — Galatians 3:24',
                },
                {
                  era: '~4 BC – 33 AD',
                  label: 'God Reaches Down',
                  sub: 'Jesus of Nazareth · The Cross · The Empty Tomb',
                  body: '"But when the fullness of time had come, God sent forth his Son, born of woman, born under the law, to redeem those who were under the law." — Galatians 4:4–5. Jesus is not another prophet or teacher. He is God in flesh — the Word who was with God from the beginning (John 1:1). He is crucified. He rises. The resurrection is the hinge of all history. Every question every religion ever asked finds its answer in an empty tomb outside Jerusalem.',
                  color: accentColor,
                  splits: [
                    { name: 'Christianity', reason: 'God became flesh. He died for our sin. He rose on the third day. The disciples — who had fled in fear — die as martyrs for this claim. The church explodes across the Roman Empire within one generation.', color: accentColor },
                    { name: 'Rabbinic Judaism', reason: 'Judaism rejects the resurrection and does not recognize Jesus as Messiah. The Temple is destroyed by Rome in 70 AD — exactly as Jesus predicted (Matthew 24:2). Judaism reorganizes around the rabbi and synagogue, awaiting Messiah still.', color: '#60a5fa' },
                  ],
                  splitNote: '"I am the way, and the truth, and the life. No one comes to the Father except through me." — John 14:6',
                },
                {
                  era: '610 AD',
                  label: 'Islam Rises',
                  sub: 'Muhammad · The Quran · Arabia',
                  body: 'Muhammad receives the Quran beginning in 610 AD near Mecca. Islam honors Abraham, Moses, and Jesus as prophets — making it explicitly Abrahamic. But it denies the Trinity, the crucifixion, and the resurrection of Jesus. From a Christian perspective, these are not minor differences — the cross and the empty tomb are everything. Within a century Islam spreads from Spain to Central Asia, becoming one of history\'s great civilizational forces.',
                  color: '#fb923c',
                  splits: [
                    { name: 'Sunni Islam (~88%)', reason: '632 AD: After Muhammad\'s death, the majority follow Abu Bakr as elected caliph — leadership by community consensus', color: '#fb923c' },
                    { name: 'Shia Islam (~12%)', reason: '632 AD: A minority insist leadership belongs to Ali ibn Abi Talib, Muhammad\'s cousin, by divine appointment rather than election', color: '#ef4444' },
                    { name: 'Sufism', reason: 'A mystical path within Islam seeking direct experience of God — through prayer, fasting, poetry, and surrender. Not a separate sect but a spiritual orientation.', color: '#f59e0b' },
                  ],
                  splitNote: '"Jesus said to them, \'Truly, truly, I say to you, before Abraham was, I am.\'" — John 8:58',
                },
                {
                  era: '1054 AD',
                  label: 'The Great Schism',
                  sub: 'Rome vs. Constantinople',
                  body: 'The church Christ built fractures. The Pope in Rome and the Patriarch in Constantinople mutually excommunicate each other over papal authority, the filioque clause, and centuries of cultural drift. Both traditions hold to the Trinity, the resurrection, and the Nicene Creed — they are divided over authority and practice, not the core of the Gospel.',
                  color: '#e879f9',
                  splits: [
                    { name: 'Roman Catholic', reason: 'The Pope holds supreme authority as successor of Peter — one visible head on earth. Seven sacraments, tradition alongside Scripture, veneration of Mary and saints.', color: '#e879f9' },
                    { name: 'Eastern Orthodox', reason: 'Authority is shared by a council of bishops. Ancient Greek liturgical tradition. Rejects papal supremacy and the filioque addition to the Nicene Creed.', color: '#818cf8' },
                  ],
                  splitNote: 'Jesus prayed they would be one (John 17:21). The church is still working toward it.',
                },
                {
                  era: '~1469 AD',
                  label: 'Sikhism',
                  sub: 'Guru Nanak · Punjab, India',
                  body: 'Guru Nanak (1469–1539) declares: "There is no Hindu, there is no Muslim." He preaches one God, no caste, all people equal before the divine. Sikhism is a distinct, new religion — not a branch of Hinduism or Islam, though shaped by encounter with both. It shares with Christianity a belief in one personal God and human equality, but does not recognize Jesus as Lord or the resurrection as the central event of history.',
                  color: '#fbbf24',
                  splits: [
                    { name: 'Sikhism', reason: 'A new monotheistic religion from Punjab. The Guru Granth Sahib is its living scripture. Believes in one God, the equality of all people, and salvation through devotion and service — but not through the cross.', color: '#fbbf24' },
                  ],
                  splitNote: null,
                },
                {
                  era: '1517 AD',
                  label: 'The Reformation',
                  sub: 'Luther · Calvin · Zwingli · Henry VIII',
                  body: 'Martin Luther nails 95 theses to the Wittenberg door — not to divide the church but to call it back to Scripture. Rome refuses to reform. The printing press puts the Bible in the hands of common people for the first time. The result is an explosion of Protestant movements, each returning to the text — and each reading it somewhat differently.',
                  color: '#34d399',
                  splits: [
                    { name: 'Lutheranism', reason: 'Faith alone. Grace alone. Scripture alone. Luther\'s three solas: salvation is entirely God\'s gift, received by faith, grounded in the Word alone.', color: '#34d399' },
                    { name: 'Reformed / Calvinist', reason: 'John Calvin emphasizes God\'s absolute sovereignty, predestination, and covenant theology. Spreads to Switzerland (Reformed), Scotland (Presbyterian), and the Netherlands.', color: '#60a5fa' },
                    { name: 'Anglicanism', reason: '1534: Henry VIII breaks from Rome primarily to annul his marriage. England gets a national church sitting between Catholic liturgy and Protestant theology.', color: '#a78bfa' },
                    { name: 'Anabaptists', reason: 'Reject infant baptism — only confessing believers may be baptized. Radically pacifist and community-focused. Ancestors of Mennonites, Amish, and the Baptist tradition.', color: '#fb923c' },
                  ],
                  splitNote: '"For by grace you have been saved through faith. And this is not your own doing; it is the gift of God." — Ephesians 2:8',
                },
                {
                  era: '1800s–Present',
                  label: 'New Traditions and the Question That Remains',
                  sub: 'Latter-day Saints · Bahá\'í · Pentecostalism',
                  body: 'New movements arise — some within Christianity, some departing from it significantly. Meanwhile the question every generation must personally answer remains unchanged: Who do you say that I am? (Matthew 16:15). The story is not finished. Jesus promised to return. The church — fractured, imperfect, and alive — waits.',
                  color: '#e879f9',
                  splits: [
                    { name: 'Latter-day Saints (1830)', reason: 'Joseph Smith claims new revelation and a restored priesthood. Mainstream Christianity considers LDS theology to differ significantly from historic orthodoxy — particularly on the nature of God, the Trinity, and salvation.', color: '#34d399' },
                    { name: 'Bahá\'í (1844)', reason: 'Claims all religions are one progressive revelation. Emerged from Shia Islam. Christianity holds that Jesus is not one prophet among many but uniquely the incarnate Son of God (John 1:14).', color: '#e879f9' },
                    { name: 'Pentecostalism (1906)', reason: 'The Azusa Street Revival ignites a global Spirit-filled movement within Christianity — speaking in tongues, healing, prophecy. Now the fastest-growing Christian expression worldwide, with over 600 million adherents.', color: '#fb923c' },
                  ],
                  splitNote: '"Jesus said to him, \'I am the way, and the truth, and the life.\'" — John 14:6',
                },
              ];

              return (
                <div>
                  {/* ── Cinematic header ── */}
                  <div className="relative rounded-3xl overflow-hidden mb-4 px-6 py-7"
                    style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}06 50%, rgba(0,0,0,0) 100%)`, border: `1px solid ${accentColor}22` }}>
                    {/* Ghost year behind text */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black select-none pointer-events-none"
                      style={{ fontSize: 80, lineHeight: 1, color: `${accentColor}08`, fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-4px' }}>
                      ∞
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: `${accentColor}66` }}>The History of Religion</p>
                    <h2 className="text-2xl font-black leading-none mb-2" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.03em' }}>
                      God Set Eternity<br />in Every Heart.
                    </h2>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.45)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                      Every religion is humanity reaching up. The Gospel is God reaching down.
                    </p>
                  </div>

                  {/* ── Timeline ── */}
                  <div className="relative" style={{ paddingLeft: 2 }}>
                    {/* Gradient vertical spine */}
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 rounded-full"
                      style={{ background: `linear-gradient(180deg, ${accentColor}00 0%, ${accentColor}50 8%, ${accentColor}30 85%, ${accentColor}00 100%)` }} />

                    <div className="space-y-5">
                      {events.map((ev, i) => (
                        <div key={i} className="flex gap-4 items-start">

                          {/* ── Left: glow dot ── */}
                          <div className="relative shrink-0 flex flex-col items-center" style={{ width: 40, paddingTop: 22 }}>
                            {/* Outer glow ring */}
                            <div className="absolute rounded-full"
                              style={{ width: 28, height: 28, top: 16, left: 6, background: `${ev.color}12`, boxShadow: `0 0 20px ${ev.color}44`, borderRadius: '50%' }} />
                            {/* Main dot */}
                            <div className="relative z-10 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                              style={{ background: `${ev.color}22`, borderColor: ev.color, boxShadow: `0 0 12px ${ev.color}66, inset 0 0 4px ${ev.color}44` }}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: ev.color, boxShadow: `0 0 6px ${ev.color}` }} />
                            </div>
                          </div>

                          {/* ── Right: card ── */}
                          <button className="flex-1 rounded-3xl overflow-hidden text-left w-full transition-all active:scale-[0.98]"
                            onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                            style={{ background: `linear-gradient(145deg, ${ev.color}10 0%, ${ev.color}04 60%, rgba(0,0,0,0) 100%)`, border: `1px solid ${expandedEvent === i ? ev.color + '40' : ev.color + '20'}`, boxShadow: expandedEvent === i ? `0 4px 32px ${ev.color}18` : `0 4px 32px ${ev.color}0a` }}>

                            {/* Top accent bar */}
                            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${ev.color}cc, ${ev.color}00)` }} />

                            <div className="px-4 pt-3 pb-3">
                              {/* Era + chevron */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]"
                                  style={{ color: `${ev.color}80` }}>{ev.era}</span>
                                <span className="text-[10px] transition-transform duration-200"
                                  style={{ color: `${ev.color}60`, transform: expandedEvent === i ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                                  ▾
                                </span>
                              </div>

                              {/* Title */}
                              <h3 className="text-base font-black leading-tight mb-0.5"
                                style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.02em' }}>
                                {ev.label}
                              </h3>
                              {/* Subtitle */}
                              <p className="text-[10px] font-bold"
                                style={{ color: ev.color, opacity: 0.8, letterSpacing: '0.02em' }}>
                                {ev.sub}
                              </p>

                              {/* Expanded content */}
                              {expandedEvent === i && (
                                <div className="mt-3">
                                  <div className="mb-3 h-px" style={{ background: `linear-gradient(90deg, ${ev.color}25, transparent)` }} />

                                  <p className="text-xs leading-[1.9]" style={{ color: 'rgba(232,240,236,0.65)', fontFamily: 'Georgia, serif' }}>
                                    {ev.body}
                                  </p>

                                  {ev.splits && ev.splits.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-2.5" style={{ color: `${ev.color}70` }}>
                                        ↳ Branched Into
                                      </p>
                                      {ev.splits.map((s: { name: string; reason: string; color: string }) => (
                                        <div key={s.name} className="flex items-start gap-3 rounded-2xl px-3 py-2.5"
                                          style={{ background: `${s.color}09`, border: `1px solid ${s.color}22` }}>
                                          <div className="shrink-0 mt-0.5 w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}80` }} />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black mb-0.5" style={{ color: s.color, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                                              {s.name}
                                            </p>
                                            <p className="text-[10px] leading-[1.7]" style={{ color: 'rgba(232,240,236,0.50)', fontFamily: 'Georgia, serif' }}>
                                              {s.reason}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                      {ev.splitNote && (
                                        <p className="text-[10px] font-bold text-center pt-1 pb-0.5 italic"
                                          style={{ color: `${ev.color}55`, fontFamily: 'Georgia, serif' }}>
                                          "{ev.splitNote}"
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* ── End node ── */}
                    <div className="flex gap-4 items-start mt-5">
                      <div className="shrink-0 flex items-center justify-center" style={{ width: 40, paddingTop: 10 }}>
                        {/* Pulsing loading ring */}
                        <div className="relative w-5 h-5 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full animate-ping"
                            style={{ background: `${accentColor}22`, animationDuration: '1.8s' }} />
                          <div className="absolute inset-0.5 rounded-full animate-ping"
                            style={{ background: `${accentColor}18`, animationDuration: '1.8s', animationDelay: '0.3s' }} />
                          <div className="relative w-2.5 h-2.5 rounded-full"
                            style={{ background: accentColor, boxShadow: `0 0 10px ${accentColor}99` }} />
                        </div>
                      </div>
                      <div className="flex-1 rounded-2xl px-5 py-4"
                        style={{ background: `linear-gradient(135deg, ${accentColor}10 0%, ${accentColor}04 100%)`, border: `1px solid ${accentColor}28` }}>
                        <p className="text-xs font-black uppercase tracking-[0.15em] mb-1.5" style={{ color: accentColor }}>Still Unfolding</p>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.65)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                          The story is not finished. Every generation must answer the same question the first one faced: Is there Someone on the other side of the silence — and does He know my name?
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Compare Mode — selection status */}
            {compareMode && (() => {
              const relA = RELIGIONS.find(r => r.name === compareA);
              const relB = RELIGIONS.find(r => r.name === compareB);
              return (
                <div className="space-y-3">
                  {/* Selection pills */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold text-center"
                      style={{ background: compareA ? `${accentColor}18` : `${accentColor}08`, border: `1px solid ${compareA ? accentColor + '44' : accentColor + '18'}`, color: compareA ? accentColor : `${accentColor}44` }}>
                      {compareA || 'Tap first…'}
                    </div>
                    <span className="text-xs font-black shrink-0" style={{ color: `${accentColor}44` }}>VS</span>
                    <div className="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold text-center"
                      style={{ background: compareB ? 'rgba(251,146,60,0.12)' : `${accentColor}08`, border: `1px solid ${compareB ? 'rgba(251,146,60,0.4)' : accentColor + '18'}`, color: compareB ? '#fb923c' : `${accentColor}44` }}>
                      {compareB || 'Tap second…'}
                    </div>
                  </div>

                  {relA && relB && (
                    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}18` }}>
                      <div className="px-4 py-4 text-center" style={{ background: `${accentColor}08`, borderBottom: `1px solid ${accentColor}15` }}>
                        <p className="font-black uppercase tracking-[0.1em]" style={{ fontSize: 15, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                          {relA.name} <span style={{ color: `${accentColor}55` }}>vs</span> {relB.name}
                        </p>
                      </div>
                      {/* Key Differences — at top */}
                      <div className="px-4 pt-4">
                        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.15)' }}>
                          <p className="text-xs font-black uppercase tracking-[0.12em] mb-3" style={{ color: '#fb923c', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Key Differences from Christianity</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2 text-left">
                              <p className="text-[9px] font-bold uppercase" style={{ color: `${accentColor}66` }}>{relA.name}</p>
                              {relA.keyDifferences.map((d, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${accentColor}15`, color: accentColor, fontSize: 9, fontWeight: 800 }}>{i + 1}</div>
                                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(232,240,236,0.55)', fontFamily: 'Georgia, serif' }}>{d}</p>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-2 text-left">
                              <p className="text-[9px] font-bold uppercase" style={{ color: 'rgba(251,146,60,0.6)' }}>{relB.name}</p>
                              {relB.keyDifferences.map((d, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', fontSize: 9, fontWeight: 800 }}>{i + 1}</div>
                                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(232,240,236,0.55)', fontFamily: 'Georgia, serif' }}>{d}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-4 space-y-4">
                        {([
                          { label: 'Founded', a: relA.founded, b: relB.founded },
                          { label: 'Followers', a: relA.followers, b: relB.followers },
                          { label: 'Scripture', a: relA.scripture, b: relB.scripture },
                          { label: 'View of God', a: relA.godView, b: relB.godView },
                          { label: 'Path to Salvation', a: relA.salvation, b: relB.salvation },
                        ] as { label: string; a: string; b: string }[]).map(row => (
                          <div key={row.label}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}55` }}>{row.label}</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg p-3" style={{ background: `${accentColor}06`, borderLeft: `2px solid ${accentColor}44` }}>
                                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: `${accentColor}66` }}>{relA.name}</p>
                                <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.65)', fontFamily: 'Georgia, serif' }}>{row.a}</p>
                              </div>
                              <div className="rounded-lg p-3" style={{ background: 'rgba(251,146,60,0.04)', borderLeft: '2px solid rgba(251,146,60,0.4)' }}>
                                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: 'rgba(251,146,60,0.6)' }}>{relB.name}</p>
                                <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.65)', fontFamily: 'Georgia, serif' }}>{row.b}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}55` }}>Core Beliefs</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg p-3 space-y-1" style={{ background: `${accentColor}06`, borderLeft: `2px solid ${accentColor}44` }}>
                              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: `${accentColor}66` }}>{relA.name}</p>
                              {relA.keyBeliefs.map((b, i) => <p key={i} className="text-xs" style={{ color: 'rgba(232,240,236,0.55)' }}>• {b}</p>)}
                            </div>
                            <div className="rounded-lg p-3 space-y-1" style={{ background: 'rgba(251,146,60,0.04)', borderLeft: '2px solid rgba(251,146,60,0.4)' }}>
                              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: 'rgba(251,146,60,0.6)' }}>{relB.name}</p>
                              {relB.keyBeliefs.map((b, i) => <p key={i} className="text-xs" style={{ color: 'rgba(232,240,236,0.55)' }}>• {b}</p>)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Grid of religion cards — grouped by tradition, alphabetical within each */}
            {!timelineMode && !commonGroundMode && (() => {
              const hasSearch = religionSearch.trim().length > 0;
              if (hasSearch) {
                // Flat grid when searching
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {filtered.map((r, idx) => (
                      <ReligionTile key={r.name} r={r}
                        isA={compareMode && compareA === r.name}
                        isB={compareMode && compareB === r.name}
                        accentColor={accentColor}
                        tileIndex={idx}
                        totalTiles={filtered.length}
                        onPress={() => {
                          const isA = compareMode && compareA === r.name;
                          const isB = compareMode && compareB === r.name;
                          if (!compareMode) { setSelectedReligion(r.name); return; }
                          if (isA) { setCompareA(''); return; }
                          if (isB) { setCompareB(''); return; }
                          if (!compareA) { setCompareA(r.name); return; }
                          if (!compareB) { setCompareB(r.name); return; }
                          setCompareA(r.name);
                        }} />
                    ))}
                  </div>
                );
              }
              // Grouped display
              const makeTilePress = (r: typeof RELIGIONS[0]) => () => {
                const isA = compareMode && compareA === r.name;
                const isB = compareMode && compareB === r.name;
                if (!compareMode) { setSelectedReligion(r.name); return; }
                if (isA) { setCompareA(''); return; }
                if (isB) { setCompareB(''); return; }
                if (!compareA) { setCompareA(r.name); return; }
                if (!compareB) { setCompareB(r.name); return; }
                setCompareA(r.name);
              };
              const visibleGroups = RELIGION_GROUPS.map(group => ({
                label: group.label,
                religions: group.names
                  .map(name => filtered.find(r => r.name === name))
                  .filter((r): r is typeof RELIGIONS[0] => !!r),
              })).filter(g => g.religions.length > 0);
              let globalTileIdx = 0;
              const totalGroupedTiles = visibleGroups.reduce((sum, g) => sum + g.religions.length, 0);
              return (
                <div className="space-y-5">
                  {visibleGroups.map(g => (
                    <div key={g.label}>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 px-0.5"
                        style={{ color: `${accentColor}cc` }}>{g.label}</p>
                      <p className="text-[9px] leading-relaxed mb-2.5 px-0.5"
                        style={{ color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{g.overview}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {g.religions.map(r => (
                          <ReligionTile key={r.name} r={r}
                            isA={compareMode && compareA === r.name}
                            isB={compareMode && compareB === r.name}
                            accentColor={accentColor}
                            tileIndex={globalTileIdx++}
                            totalTiles={totalGroupedTiles}
                            onPress={makeTilePress(r)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}
