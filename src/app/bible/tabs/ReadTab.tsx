'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ApiBible, Passage, PassageSection, BookDef, ParsedVerse, T, BOOKS, POPULAR_ABBRS, SUPPORTED_LANGUAGES, cleanMarkdown, completeDailyCheck,
} from '../types';

// ── Book deep study data ──────────────────────────────────────────────────────
interface BookStudy {
  author: string;
  when: string;
  audience: string;
  bigIdea: string;
  context: string;
  themes: string[];
  outline: { section: string; chapters: string }[];
  keyVerses: { ref: string; text: string }[];
  christConnection: string;
  application: string;
}

const BOOK_DEEP_STUDY: Record<string, BookStudy> = {
  Genesis: {
    author: 'Moses', when: '~1445–1400 BC', audience: 'The nation of Israel, newly freed from Egypt',
    bigIdea: 'God is the sovereign Creator who chose a people through whom He would bless the entire world.',
    context: 'Written during Israel\'s wilderness wanderings after the Exodus. A people with no written history needed to understand who they were, who their God was, and why He chose them. Genesis answers the deepest human questions: Where did we come from? Why is the world broken? What is God doing about it?',
    themes: ['Creation & the nature of God', 'The Fall and the entrance of sin', 'Covenant — God binds Himself to His people', 'Providence — God works all things together for good'],
    outline: [
      { section: 'Primeval History — Creation to Nations', chapters: '1–11' },
      { section: 'Abraham — The Father of Faith', chapters: '12–25' },
      { section: 'Isaac & Jacob — The Covenant Continues', chapters: '25–36' },
      { section: 'Joseph — Providence in the Pit', chapters: '37–50' },
    ],
    keyVerses: [
      { ref: 'Genesis 1:1', text: 'In the beginning God created the heavens and the earth.' },
      { ref: 'Genesis 3:15', text: 'I will put enmity between you and the woman... he will crush your head.' },
      { ref: 'Genesis 12:3', text: 'All peoples on earth will be blessed through you.' },
      { ref: 'Genesis 50:20', text: 'You intended to harm me, but God intended it for good.' },
    ],
    christConnection: 'Genesis 3:15 is the first promise of a Savior — the "seed of the woman" who will crush the serpent. Abraham\'s near-sacrifice of Isaac (ch 22) foreshadows the Father offering His Son. Joseph\'s suffering, betrayal, and ultimate rescue of his brothers is one of the richest pictures of Christ in all Scripture.',
    application: 'No matter how broken your story looks right now, God is writing it toward redemption. The same God who brought light out of darkness and life out of barrenness is working in your life.',
  },

  Exodus: {
    author: 'Moses', when: '~1445–1400 BC', audience: 'Israel in the wilderness',
    bigIdea: 'God rescues His people from slavery not just to set them free, but to dwell among them.',
    context: 'After 400 years of brutal slavery in Egypt, God raises up Moses as a deliverer. The ten plagues demonstrate God\'s power over every Egyptian deity. The Exodus becomes the defining event of the OT — the lens through which Israel understood God\'s saving power. The entire second half of the book (chs 25–40) focuses on building the Tabernacle so God can live among His people.',
    themes: ['Redemption — God rescues the helpless', 'The Law — God\'s standard of holiness', 'The Tabernacle — God\'s desire to dwell with humanity', 'Covenant — "I will be your God, you will be my people"'],
    outline: [
      { section: 'Israel\'s Slavery and Moses\' Call', chapters: '1–6' },
      { section: 'The Ten Plagues and the Passover', chapters: '7–12' },
      { section: 'The Exodus and Crossing the Red Sea', chapters: '13–18' },
      { section: 'The Law Given at Sinai', chapters: '19–24' },
      { section: 'The Tabernacle — Instructions and Construction', chapters: '25–40' },
    ],
    keyVerses: [
      { ref: 'Exodus 3:14', text: 'God said to Moses, "I AM WHO I AM."' },
      { ref: 'Exodus 12:13', text: 'When I see the blood, I will pass over you.' },
      { ref: 'Exodus 20:2–3', text: 'I am the LORD your God... You shall have no other gods before me.' },
      { ref: 'Exodus 40:34', text: 'Then the cloud covered the tent of meeting, and the glory of the LORD filled the tabernacle.' },
    ],
    christConnection: 'The Passover lamb (ch 12) is the most direct foreshadowing of Christ in the OT — John the Baptist declared "Behold, the Lamb of God who takes away the sin of the world" (John 1:29). The Tabernacle itself points to the Incarnation: "the Word became flesh and dwelt [tabernacled] among us" (John 1:14). Every detail of the sacrificial system points to what Jesus would fulfill on the cross.',
    application: 'You have been delivered from a slavery far greater than Egypt\'s. The same power that split the Red Sea is available to you. The question God asks Israel is the question He asks you: "Will you trust me in the wilderness?"',
  },

  Job: {
    author: 'Unknown — possibly Job himself, Moses, or Solomon', when: 'Possibly the oldest book of the Bible, set in the Patriarchal era (~2000 BC)', audience: 'Anyone wrestling with suffering and the silence of God',
    bigIdea: 'God is sovereign and good even when life makes no sense — suffering is not always punishment, and God\'s ways are higher than our understanding.',
    context: 'Job is a wealthy, righteous man in the land of Uz. In a scene unseen by Job, God permits Satan to strip him of everything — his children, his wealth, his health — to test whether he loves God for who God is or for what God gives. Three friends offer terrible theology. A fourth speaks closer to truth. Then God answers from the whirlwind with a thundering display of His majesty.',
    themes: ['Suffering and the sovereignty of God', 'The limits of human wisdom', 'Faith that holds through silence', 'The transcendence and immanence of God'],
    outline: [
      { section: 'Prologue — The Heavenly Court', chapters: '1–2' },
      { section: 'Job\'s Lament and Three Friends\' Bad Theology', chapters: '3–31' },
      { section: 'Elihu Speaks — Closer to Truth', chapters: '32–37' },
      { section: 'God Answers from the Whirlwind', chapters: '38–41' },
      { section: 'Epilogue — Restoration', chapters: '42' },
    ],
    keyVerses: [
      { ref: 'Job 1:21', text: 'The LORD gave and the LORD has taken away; may the name of the LORD be praised.' },
      { ref: 'Job 19:25', text: 'I know that my redeemer lives, and that in the end he will stand on the earth.' },
      { ref: 'Job 38:4', text: 'Where were you when I laid the earth\'s foundation?' },
      { ref: 'Job 42:5', text: 'My ears had heard of you but now my eyes have seen you.' },
    ],
    christConnection: 'Job cries out for a mediator — someone who can stand between himself and God (9:33, 16:19–21). Jesus is that mediator (1 Tim 2:5). Job\'s declaration "I know that my Redeemer lives" (19:25) is one of the most powerful Messianic declarations in the OT. Job\'s suffering also foreshadows Christ\'s — an innocent man crushed, yet vindicated and exalted.',
    application: 'God\'s silence is not His absence. When you can\'t trace His hand, trust His heart. The goal of suffering is not explanation — it\'s encounter. Job didn\'t get answers; he got God. That was enough.',
  },

  Psalms: {
    author: 'David (73 psalms), Asaph (12), Sons of Korah (11), Solomon (2), Moses (1), others', when: '~1000–400 BC, compiled over 600 years', audience: 'Israel in worship; every human soul in every emotional state',
    bigIdea: 'God is worthy of praise in every season — lament, joy, fear, triumph, confession, and longing are all holy.',
    context: 'The Psalms are the prayer book and hymnbook of ancient Israel, sung in the Temple and memorized by every Jew. They cover the full range of human experience — from the pit of depression (Ps 88) to ecstatic praise (Ps 150). Jesus quoted the Psalms more than any other OT book. He sang them at the Last Supper. He cried out Psalm 22 from the cross.',
    themes: ['The majesty and intimacy of God', 'Lament — honest prayer in pain', 'The coming Messiah — prophetic psalms', 'Worship as the purpose of creation'],
    outline: [
      { section: 'Book I — Mostly David: Intimacy with God', chapters: '1–41' },
      { section: 'Book II — National Life and Worship', chapters: '42–72' },
      { section: 'Book III — Temple Worship and Crisis', chapters: '73–89' },
      { section: 'Book IV — God\'s Eternal Reign', chapters: '90–106' },
      { section: 'Book V — Praise and Hallelujah Psalms', chapters: '107–150' },
    ],
    keyVerses: [
      { ref: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' },
      { ref: 'Psalm 46:10', text: 'Be still, and know that I am God.' },
      { ref: 'Psalm 22:1', text: 'My God, my God, why have you forsaken me?' },
      { ref: 'Psalm 119:105', text: 'Your word is a lamp for my feet, a light on my path.' },
      { ref: 'Psalm 150:6', text: 'Let everything that has breath praise the LORD.' },
    ],
    christConnection: 'The Psalms are saturated with Christ. Psalm 22 describes the crucifixion in detail 1,000 years before it happened — the pierced hands, the casting of lots for clothing, the mocking crowds. Psalm 16 prophesies the resurrection ("you will not abandon me to the realm of the dead"). Psalm 110 declares Jesus as both King and eternal Priest. Peter, Paul, and Jesus himself all quoted these directly as fulfilled in Christ.',
    application: 'The Psalms give you permission to be honest with God. You don\'t have to clean up your prayers. Lament is not faithlessness — it\'s intimacy. Bring your whole self to God. He can handle it.',
  },

  Isaiah: {
    author: 'Isaiah son of Amoz', when: '~740–680 BC (ministry spans 4 kings)', audience: 'Judah on the brink of Assyrian invasion and eventual Babylonian exile',
    bigIdea: 'God is the Holy One of Israel — He judges sin, but His ultimate purpose is to redeem and restore all things through His coming Servant.',
    context: 'Isaiah prophesied during one of the most turbulent periods in Israel\'s history — the northern kingdom fell to Assyria in 722 BC while he was still alive. He warned Judah that Babylon would eventually take them too. But interwoven with judgment is the most breathtaking vision of redemption in the OT. Chapters 40–55 are so gospel-saturated they\'re called "Deutero-Isaiah" by skeptics — but that\'s because they\'re so accurately fulfilled in Jesus.',
    themes: ['The holiness and judgment of God', 'The suffering Servant — Messianic prophecy', 'Comfort and restoration for God\'s people', 'The new creation — God makes all things new'],
    outline: [
      { section: 'The Book of Judgment — Woe to Israel and the Nations', chapters: '1–39' },
      { section: 'The Book of Comfort — "Comfort, comfort my people"', chapters: '40–55' },
      { section: 'The Book of Glory — The New Creation', chapters: '56–66' },
    ],
    keyVerses: [
      { ref: 'Isaiah 6:3', text: 'Holy, holy, holy is the LORD Almighty; the whole earth is full of his glory.' },
      { ref: 'Isaiah 40:31', text: 'Those who hope in the LORD will renew their strength. They will soar on wings like eagles.' },
      { ref: 'Isaiah 53:5', text: 'He was pierced for our transgressions, he was crushed for our iniquities.' },
      { ref: 'Isaiah 55:11', text: 'My word that goes out from my mouth... will not return to me empty.' },
    ],
    christConnection: 'Isaiah 53 is the most detailed Messianic prophecy in the entire Bible — written 700 years before Christ, describing His suffering, rejection, death for sin, and vindication with surgical precision. Jesus read from Isaiah 61 in the synagogue and declared "Today this scripture is fulfilled in your hearing." Philip used Isaiah 53 to lead the Ethiopian eunuch to faith.',
    application: 'When life feels like chapter 39 (loss, judgment, darkness), you are not yet in chapter 40. "Comfort, comfort my people" is God\'s word after the hardest seasons. He does not leave you in the ruins.',
  },

  Matthew: {
    author: 'Matthew (Levi), former tax collector and disciple of Jesus', when: '~50–70 AD', audience: 'Jewish Christians, to demonstrate Jesus is the promised Messiah of the OT',
    bigIdea: 'Jesus of Nazareth is the King the Old Testament promised — He fulfills the Law, the Prophets, and the Psalms.',
    context: 'Written primarily to a Jewish-Christian community, Matthew quotes the OT over 60 times, constantly showing how Jesus fulfills ancient prophecy. He organizes his Gospel around five great discourses (mirroring the five books of Moses), presenting Jesus as the new and greater Moses who gives God\'s authoritative word.',
    themes: ['Jesus as the fulfillment of OT prophecy', 'The Kingdom of Heaven — what it is and how to enter', 'Discipleship — the cost and call of following Jesus', 'The church — Jesus builds a new community'],
    outline: [
      { section: 'Birth and Preparation of the King', chapters: '1–4' },
      { section: 'The Sermon on the Mount — Kingdom Ethics', chapters: '5–7' },
      { section: 'Miracles and Mission', chapters: '8–12' },
      { section: 'Parables of the Kingdom', chapters: '13' },
      { section: 'The Church, Forgiveness, and End Times', chapters: '14–25' },
      { section: 'Passion, Death, and Resurrection', chapters: '26–28' },
    ],
    keyVerses: [
      { ref: 'Matthew 5:3', text: 'Blessed are the poor in spirit, for theirs is the kingdom of heaven.' },
      { ref: 'Matthew 6:33', text: 'Seek first his kingdom and his righteousness, and all these things will be given to you as well.' },
      { ref: 'Matthew 16:18', text: 'On this rock I will build my church, and the gates of Hades will not overcome it.' },
      { ref: 'Matthew 28:19–20', text: 'Go and make disciples of all nations... And surely I am with you always.' },
    ],
    christConnection: 'Matthew IS the Christ connection — the entire book is written to prove Jesus is the Messiah. From the genealogy tracing Jesus through Abraham and David, to the 60+ OT fulfillments, every chapter screams: "This is the One the whole Bible has been waiting for."',
    application: 'Jesus\' first word in the Sermon on the Mount is "Blessed" — which means flourishing, whole, fully alive. That\'s what He offers you, not as a reward for performance, but as a gift to the broken, the hungry, and the humble.',
  },

  John: {
    author: 'John the Apostle, "the disciple whom Jesus loved"', when: '~85–95 AD', audience: 'Both Jewish and Gentile believers; written to deepen faith and prove Jesus\' divinity',
    bigIdea: '"Jesus is the Christ, the Son of God, and that by believing you may have life in his name." (John 20:31)',
    context: 'Written decades after the other three Gospels, John\'s account is more theological and reflective. He doesn\'t record the same parables or exorcisms — instead he gives us long, intimate discourses (chapters 13–17 cover one night). John was the disciple closest to Jesus and the only one present at the crucifixion. He writes to a church facing Gnostic heresy that denied Jesus came in the flesh.',
    themes: ['The deity of Christ — "In the beginning was the Word"', 'Belief and eternal life', 'The Holy Spirit — the Counselor Jesus sends', 'Love — the command and the nature of God'],
    outline: [
      { section: 'Prologue — The Word Made Flesh', chapters: '1' },
      { section: '7 Signs — Miracles that Reveal Who Jesus Is', chapters: '2–12' },
      { section: 'The Upper Room — Jesus\' Final Night', chapters: '13–17' },
      { section: 'The Passion — Arrest, Trial, Crucifixion', chapters: '18–19' },
      { section: 'Resurrection and Restoration', chapters: '20–21' },
    ],
    keyVerses: [
      { ref: 'John 1:14', text: 'The Word became flesh and made his dwelling among us.' },
      { ref: 'John 3:16', text: 'For God so loved the world that he gave his one and only Son.' },
      { ref: 'John 11:25', text: 'I am the resurrection and the life.' },
      { ref: 'John 14:6', text: 'I am the way and the truth and the life. No one comes to the Father except through me.' },
      { ref: 'John 20:28', text: 'Thomas said to him, "My Lord and my God!"' },
    ],
    christConnection: 'John\'s entire purpose is to reveal Christ. The seven "I Am" statements (Bread of Life, Light of the World, Gate, Good Shepherd, Resurrection, Way/Truth/Life, True Vine) each echo God\'s self-revelation as "I AM" in Exodus 3. The seven signs build an undeniable case: this Man is God in flesh. The trial before Pilate ends with Pilate writing "King of the Jews" in three languages — the whole world declaring His identity.',
    application: 'Jesus doesn\'t just give life — He IS life (John 14:6). The invitation of John\'s Gospel is simple: believe. Not believe harder, not earn more, not perform better. Just come to the One who is the Way, and walk with Him.',
  },

  Acts: {
    author: 'Luke (sequel to his Gospel)', when: '~62 AD', audience: 'Theophilus (likely a Roman official) and all who need to know the gospel\'s unstoppable spread',
    bigIdea: 'The Holy Spirit empowers ordinary people to take the gospel to the ends of the earth, and nothing — persecution, prison, storms, or death — can stop it.',
    context: 'Acts begins where Luke\'s Gospel ends — at the Ascension. Jesus tells the disciples to wait for the Holy Spirit, then go. What follows is 30 years of explosive church growth, from 120 people in an upper room to communities across the Roman Empire. Acts covers the first two missionary journeys of Paul and ends, intentionally, with Paul in Rome — the capital of the known world — preaching freely.',
    themes: ['The Holy Spirit — the engine of the church', 'The gospel advances through resistance', 'Jew and Gentile — one new body in Christ', 'Witness — every believer is sent'],
    outline: [
      { section: 'Jerusalem — The Church is Born', chapters: '1–7' },
      { section: 'Judea & Samaria — The Gospel Spreads', chapters: '8–12' },
      { section: 'Paul\'s First Missionary Journey', chapters: '13–14' },
      { section: 'The Jerusalem Council — Gentile Inclusion', chapters: '15' },
      { section: 'Paul\'s Second and Third Journeys', chapters: '16–21' },
      { section: 'Paul\'s Arrest, Trials, and Journey to Rome', chapters: '22–28' },
    ],
    keyVerses: [
      { ref: 'Acts 1:8', text: 'You will receive power when the Holy Spirit comes on you; and you will be my witnesses... to the ends of the earth.' },
      { ref: 'Acts 2:42', text: 'They devoted themselves to the apostles\' teaching and to fellowship, to the breaking of bread and to prayer.' },
      { ref: 'Acts 4:12', text: 'Salvation is found in no one else, for there is no other name under heaven given to mankind.' },
      { ref: 'Acts 16:31', text: 'Believe in the Lord Jesus, and you will be saved.' },
    ],
    christConnection: 'Acts is the story of what the risen Christ continues to do through His Spirit. Luke himself calls it an account of "all that Jesus began to do and to teach" (1:1) — implying the Gospel was what Jesus began, and Acts is what He continued. The ascended Christ appears to Paul on the Damascus road, directs Peter to Cornelius, and sends His Spirit to guide every step.',
    application: 'The same Holy Spirit who came at Pentecost lives in every believer. You are not waiting for God\'s power to show up — it already has. The question is whether you\'ll trust it enough to open your mouth.',
  },

  Romans: {
    author: 'Paul the Apostle', when: '~57 AD, written from Corinth', audience: 'The church in Rome — a mixed Jewish-Gentile congregation Paul had never visited',
    bigIdea: 'The gospel is the power of God for salvation to everyone who believes — Jew and Gentile alike — because God\'s righteousness is received by faith alone.',
    context: 'Paul had never been to Rome but hoped to visit on his way to Spain. He writes this letter as a systematic presentation of the gospel — his most complete theological work. He addresses the tension between Jewish and Gentile believers and corrects misunderstandings about grace, the Law, and Israel\'s future. Romans has launched more revivals, reformations, and conversions than any other letter in history.',
    themes: ['Universal sin — all have fallen short', 'Justification by faith — declared righteous through Christ', 'Sanctification — the Holy Spirit transforms us', 'God\'s faithfulness to Israel and His cosmic plan'],
    outline: [
      { section: 'The Gospel Defined — All Are Guilty', chapters: '1–3' },
      { section: 'Justification by Faith — Abraham as Proof', chapters: '4–5' },
      { section: 'Sanctification — Dead to Sin, Alive to God', chapters: '6–8' },
      { section: 'God\'s Plan for Israel', chapters: '9–11' },
      { section: 'Living the Gospel — Practical Ethics', chapters: '12–16' },
    ],
    keyVerses: [
      { ref: 'Romans 1:16', text: 'I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes.' },
      { ref: 'Romans 3:23', text: 'For all have sinned and fall short of the glory of God.' },
      { ref: 'Romans 5:8', text: 'God demonstrates his own love for us in this: while we were still sinners, Christ died for us.' },
      { ref: 'Romans 8:28', text: 'In all things God works for the good of those who love him.' },
      { ref: 'Romans 8:38–39', text: 'Neither death nor life... nor anything else in all creation, will be able to separate us from the love of God.' },
    ],
    christConnection: 'Romans is the theological spine of the gospel of Christ. Chapter 5 presents the "two Adams" — in the first Adam all die, in the second Adam (Christ) all are made alive. The righteousness God demands and we cannot produce, Jesus provides. His death satisfies God\'s wrath (propitiation, 3:25). His resurrection declares us righteous (4:25). Chapter 8 is the greatest chapter on our security in Christ ever written.',
    application: 'There is no condemnation for those in Christ Jesus (8:1). You don\'t earn standing with God by your performance — it\'s a gift received by faith. Let this sink deep: God is for you (8:31). Nothing can separate you from His love.',
  },

  Ephesians: {
    author: 'Paul the Apostle', when: '~60–62 AD, written from prison in Rome', audience: 'The church at Ephesus and surrounding churches in Asia Minor',
    bigIdea: 'Because of who you are in Christ (chs 1–3), live accordingly — in unity, purity, and spiritual warfare (chs 4–6).',
    context: 'Ephesus was one of the most important cities in the Roman Empire — home to the Temple of Artemis (one of the Seven Wonders of the Ancient World) and a major hub of commerce, magic, and pagan religion. Paul spent three years there. Writing from prison, he gives the church its highest and most complete vision of its identity and calling.',
    themes: ['Identity in Christ — who you are, not what you do', 'The church as Christ\'s body and bride', 'Unity across all divisions — Jew, Gentile, male, female', 'Spiritual warfare — the unseen battle we\'re in'],
    outline: [
      { section: 'Seated — Every Spiritual Blessing in Christ', chapters: '1–3' },
      { section: 'Walking — Live Worthy of the Calling', chapters: '4' },
      { section: 'Filled — Walk in Love, Light, and Wisdom', chapters: '5' },
      { section: 'Standing — The Armor of God', chapters: '6' },
    ],
    keyVerses: [
      { ref: 'Ephesians 1:3', text: 'Praise be to the God and Father of our Lord Jesus Christ, who has blessed us in the heavenly realms with every spiritual blessing in Christ.' },
      { ref: 'Ephesians 2:8–9', text: 'For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God.' },
      { ref: 'Ephesians 2:10', text: 'For we are God\'s handiwork, created in Christ Jesus to do good works.' },
      { ref: 'Ephesians 6:12', text: 'For our struggle is not against flesh and blood, but against the rulers, against the authorities, against the spiritual forces of evil.' },
    ],
    christConnection: 'Paul opens with a majestic doxology listing everything God has given us "in Christ" — chosen, adopted, redeemed, forgiven, sealed, destined for glory. Jesus is the head of the church (1:22), the one who broke down the dividing wall between Jew and Gentile (2:14), and the one who fills all in all (1:23). Chapter 5\'s picture of marriage — husband loving sacrificially as Christ loved the church — is one of Scripture\'s most profound descriptions of the cross.',
    application: 'You are not defined by your past, your failures, or your wounds. You are defined by what God says about you in Christ: chosen, adopted, redeemed, sealed, God\'s masterpiece (2:10). Live from that identity, not toward it.',
  },

  Revelation: {
    author: 'John the Apostle, in exile on the island of Patmos', when: '~95 AD, under Emperor Domitian\'s persecution', audience: 'Seven specific churches in Asia Minor; all persecuted believers in every age',
    bigIdea: 'Jesus Christ is Lord of all history, He wins in the end, and His people have nothing to fear.',
    context: 'The Roman Emperor Domitian demanded to be worshipped as "Lord and God." Christians who refused were imprisoned, killed, or exiled. John receives this vision to show suffering believers the big picture: the same Jesus who was crucified is now enthroned, controlling every seal, trumpet, and bowl of history. Revelation is apocalyptic literature — a genre that uses vivid symbolism to convey spiritual reality, not a newspaper with literal predictions.',
    themes: ['The sovereignty of Christ over history', 'Worship — the appropriate response to God\'s majesty', 'Judgment — God\'s justice will prevail', 'New creation — all things made new'],
    outline: [
      { section: 'Vision of Christ and Letters to 7 Churches', chapters: '1–3' },
      { section: 'The Throne Room — Heaven\'s Perspective', chapters: '4–5' },
      { section: 'Seven Seals, Trumpets, and Bowls — Judgment', chapters: '6–16' },
      { section: 'The Fall of Babylon — The World System Judged', chapters: '17–18' },
      { section: 'The Return of Christ and Final Judgment', chapters: '19–20' },
      { section: 'The New Heaven, New Earth, and New Jerusalem', chapters: '21–22' },
    ],
    keyVerses: [
      { ref: 'Revelation 1:8', text: '"I am the Alpha and the Omega," says the Lord God, "who is, and who was, and who is to come, the Almighty."' },
      { ref: 'Revelation 3:20', text: 'Here I am! I stand at the door and knock.' },
      { ref: 'Revelation 5:5', text: '"Do not weep! See, the Lion of the tribe of Judah, the Root of David, has triumphed."' },
      { ref: 'Revelation 21:4', text: '"He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain."' },
    ],
    christConnection: 'Revelation IS the revelation of Jesus Christ (1:1). Every image is about Him. He is the Lamb who was slain and is now worthy to open the scroll (ch 5) — the most moving scene in all of Scripture. He is the rider on the white horse (ch 19). He is the King of Kings. The entire Bible begins with a garden and ends with a city — and Jesus is the center of both.',
    application: 'History is not random. It is not spiraling out of control. There is a throne, and Someone is seated on it. Read Revelation not to decode the news but to see Jesus high and lifted up — and to be ruined for anything less.',
  },

  Leviticus: {
    author: 'Moses', when: '~1445–1400 BC', audience: 'The nation of Israel at the foot of Mount Sinai',
    bigIdea: 'A holy God can only dwell with a holy people — and He provides the very means by which sinners can draw near to Him.',
    context: 'Leviticus picks up exactly where Exodus leaves off: the Tabernacle is built and God\'s glory has filled it. But Israel can\'t just walk in — God is holy, they are not. Leviticus is God\'s instruction manual for how sinful people approach a holy God: through sacrifice, through priests, and through a life set apart. It may feel tedious, but every ritual screams one thing: sin costs blood, and God will provide the substitute.',
    themes: ['Holiness — "Be holy as I am holy"', 'Atonement — sin requires a blood sacrifice', 'The Priesthood — mediators between God and humanity', 'Clean and unclean — set apart from the nations'],
    outline: [
      { section: 'The Five Offerings — How to Approach God', chapters: '1–7' },
      { section: 'The Priesthood — Consecration and Failure', chapters: '8–10' },
      { section: 'Clean and Unclean — Purity Laws', chapters: '11–15' },
      { section: 'The Day of Atonement — Yom Kippur', chapters: '16' },
      { section: 'The Holiness Code — Ethical and Ritual Law', chapters: '17–27' },
    ],
    keyVerses: [
      { ref: 'Leviticus 11:44', text: 'I am the LORD your God; consecrate yourselves and be holy, because I am holy.' },
      { ref: 'Leviticus 16:30', text: 'On this day atonement will be made for you, to cleanse you. Then, before the LORD, you will be clean from all your sins.' },
      { ref: 'Leviticus 17:11', text: 'For the life of a creature is in the blood, and I have given it to you to make atonement for yourselves on the altar.' },
      { ref: 'Leviticus 19:18', text: 'Love your neighbor as yourself. I am the LORD.' },
    ],
    christConnection: 'Leviticus is entirely about Jesus — He just hasn\'t arrived yet. Every sacrifice points to His once-for-all offering (Hebrews 10:1–14). The Day of Atonement\'s two goats picture the double nature of His work: the sacrificed goat (bearing punishment) and the scapegoat (bearing sin away). The High Priest entering the Holy of Holies once a year foreshadows Jesus entering heaven itself with His own blood (Heb 9:11–12).',
    application: 'God did not leave us to figure out how to reach Him. He designed every detail of approach. Today, that path is Jesus — the final, perfect sacrifice. You don\'t need to earn access. He opened the way.',
  },

  Numbers: {
    author: 'Moses', when: '~1445–1400 BC', audience: 'Israel in the wilderness',
    bigIdea: 'Unbelief has consequences — but God\'s covenant faithfulness outlasts a generation\'s rebellion.',
    context: 'Numbers covers 40 years of Israel wandering in the desert, most of which resulted from one catastrophic failure: refusing to trust God and enter the Promised Land at Kadesh Barnea (ch 13–14). Two census counts (hence "Numbers") bookend the story — the first generation that died in the wilderness and the second generation that would enter Canaan. Throughout, the book is brutally honest about Israel\'s failures and God\'s patient discipline.',
    themes: ['Faith vs. unbelief — Caleb and Joshua vs. the 10 spies', 'God\'s discipline of His people', 'The wilderness as a training ground', 'God\'s provision — manna, quail, water'],
    outline: [
      { section: 'The First Census and Preparations to March', chapters: '1–10' },
      { section: 'Complaints, Rebellion, and Judgment', chapters: '11–25' },
      { section: 'The Second Census and Preparation for Canaan', chapters: '26–36' },
    ],
    keyVerses: [
      { ref: 'Numbers 6:24–26', text: 'The LORD bless you and keep you; the LORD make his face shine on you and be gracious to you.' },
      { ref: 'Numbers 14:11', text: 'How long will these people treat me with contempt? How long will they refuse to believe in me?' },
      { ref: 'Numbers 21:9', text: 'Moses made a bronze snake and put it up on a pole. Then when anyone was bitten by a snake and looked at the bronze snake, they lived.' },
      { ref: 'Numbers 23:19', text: 'God is not human, that he should lie... Does he promise and not fulfill?' },
    ],
    christConnection: 'Jesus himself points to Numbers 21 — the bronze serpent lifted up in the desert — as a picture of His crucifixion: "Just as Moses lifted up the snake in the wilderness, so the Son of Man must be lifted up, that everyone who believes may have eternal life" (John 3:14–15). The rock that followed Israel and provided water in the desert was Christ (1 Cor 10:4). Balaam\'s oracles prophesy a Star from Jacob — the Messiah (Num 24:17).',
    application: 'The wilderness is not the end of the story. It is the school where God builds the faith that the Promised Land requires. Your wandering season has a purpose. Believe when it\'s hard.',
  },

  Deuteronomy: {
    author: 'Moses', when: '~1406 BC — the last weeks of Moses\' life', audience: 'The new generation of Israel, about to enter Canaan',
    bigIdea: 'Love the LORD your God with all your heart — remember what He\'s done, obey His commands, and choose life.',
    context: 'Deuteronomy means "second law" — it\'s Moses\' final three sermons to the generation born in the wilderness, rehearsing the covenant before they cross the Jordan. Moses will not go in with them (because of his sin at Meribah, Num 20). He spends his final days pouring everything into the people. The book ends with his death on Mount Nebo, overlooking the land he could not enter.',
    themes: ['Love as the heart of obedience', 'Remember — don\'t forget what God has done', 'Choose life — blessing and curse are set before you', 'The coming Prophet — Jesus foretold'],
    outline: [
      { section: 'First Sermon — History Reviewed', chapters: '1–4' },
      { section: 'Second Sermon — The Law Renewed (The Shema)', chapters: '5–26' },
      { section: 'The Covenant Renewed — Blessing and Curse', chapters: '27–30' },
      { section: 'Moses\' Final Words, Song, and Death', chapters: '31–34' },
    ],
    keyVerses: [
      { ref: 'Deuteronomy 6:4–5', text: 'Hear, O Israel: The LORD our God, the LORD is one. Love the LORD your God with all your heart and with all your soul and with all your strength.' },
      { ref: 'Deuteronomy 8:3', text: 'Man does not live on bread alone but on every word that comes from the mouth of the LORD.' },
      { ref: 'Deuteronomy 30:19', text: 'I have set before you life and death, blessings and curses. Now choose life.' },
      { ref: 'Deuteronomy 31:8', text: 'The LORD himself goes before you and will be with you; he will never leave you nor forsake you.' },
    ],
    christConnection: 'Moses promises God will raise up another Prophet like him (18:15–18) — fulfilled in Jesus, who is the ultimate Prophet, Priest, and King. Jesus quoted Deuteronomy three times when tempted by Satan in the wilderness (Matt 4). The Great Commandment (Deut 6:5) was Jesus\' own answer when asked which law was greatest. Moses\' death outside the land he gave his life for mirrors Jesus\' sacrifice — giving everything for a people He led home.',
    application: 'The Shema is still the heartbeat of the faith: love God with everything. Obedience doesn\'t earn His love — it responds to it. You already have His love. Now let it overflow.',
  },

  Joshua: {
    author: 'Joshua (possibly with later additions)', when: '~1400–1370 BC', audience: 'Israel entering and conquering the Promised Land',
    bigIdea: 'God is faithful — every promise He made to Abraham, Isaac, and Jacob is fulfilled. Be strong and courageous; the land is yours.',
    context: 'After 40 years of wilderness, the moment finally arrives. Moses is dead. Joshua leads Israel across the Jordan River on dry ground (another Red Sea miracle). The conquest of Canaan unfolds — not through military genius but through radical obedience: walk around Jericho, stretch out your spear, hang a scarlet cord in the window. The land is divided among the tribes. Joshua closes with a covenant renewal at Shechem and his famous challenge to choose.',
    themes: ['God\'s faithfulness to every promise', 'Courage rooted in God\'s presence, not circumstances', 'Obedience unlocks what God has already given', 'The danger of compromise with sin'],
    outline: [
      { section: 'Entering the Land — Crossing the Jordan', chapters: '1–5' },
      { section: 'The Conquest — Jericho, Ai, Southern and Northern Campaigns', chapters: '6–12' },
      { section: 'Dividing the Land Among the Tribes', chapters: '13–21' },
      { section: 'Covenant Renewal — "As for me and my house"', chapters: '22–24' },
    ],
    keyVerses: [
      { ref: 'Joshua 1:9', text: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.' },
      { ref: 'Joshua 2:21', text: 'She tied the scarlet cord in the window.' },
      { ref: 'Joshua 21:45', text: 'Not one of all the LORD\'s good promises to Israel failed; every one was fulfilled.' },
      { ref: 'Joshua 24:15', text: 'As for me and my household, we will serve the LORD.' },
    ],
    christConnection: 'Joshua\'s name in Hebrew is Yeshua — the same name as Jesus. The New Testament writers saw this as intentional: Joshua led Israel into the earthly Promised Land; Jesus leads His people into the heavenly rest (Hebrews 4:8). Rahab the prostitute — saved by a scarlet cord, a Gentile, an outsider — appears in Jesus\' genealogy (Matthew 1:5). The conquest is brutal, but it is the judgment of God on nations whose sin had reached its full measure (Gen 15:16).',
    application: 'What God has promised, He will perform. The same God who parted the Jordan will go before you into whatever you\'re facing. Be strong — not in yourself, but in the Lord. He goes first.',
  },

  Judges: {
    author: 'Unknown — possibly Samuel', when: '~1050–1000 BC, covering events ~1375–1050 BC', audience: 'Israel in the period before the monarchy',
    bigIdea: 'When everyone does what is right in their own eyes, the result is chaos — but God keeps raising up deliverers for a people who keep abandoning Him.',
    context: 'Judges is the darkest book in the Old Testament. A brutal, repeating cycle: Israel abandons God → God withdraws protection → enemies oppress Israel → Israel cries out → God raises a judge (deliverer) → Israel is rescued → Israel forgets again. The judges get progressively worse — from the faithful Othniel to the morally compromised Samson. The book ends with horrors that rival anything in modern history, showing how far a nation drifts without God.',
    themes: ['The cycle of sin, consequence, repentance, rescue', 'The danger of forgetting God\'s works', 'God\'s grace to the undeserving', 'The need for a king — but only the right King'],
    outline: [
      { section: 'The Pattern Established — Israel\'s Failure', chapters: '1–3' },
      { section: 'The Major Judges — Deborah, Gideon, Jephthah', chapters: '3–12' },
      { section: 'Samson — The Tragic Hero', chapters: '13–16' },
      { section: 'Two Appendices — The Depth of Israel\'s Depravity', chapters: '17–21' },
    ],
    keyVerses: [
      { ref: 'Judges 2:16', text: 'Then the LORD raised up judges, who saved them out of the hands of these raiders.' },
      { ref: 'Judges 6:14', text: 'The LORD turned to him and said, "Go in the strength you have and save Israel out of Midian\'s hand. Am I not sending you?"' },
      { ref: 'Judges 16:28', text: 'Sovereign LORD, remember me. Please, God, strengthen me just once more.' },
      { ref: 'Judges 21:25', text: 'In those days Israel had no king; everyone did as they saw fit.' },
    ],
    christConnection: 'Every judge is a broken, flawed deliverer — a shadow of the One who would come. Samson, born miraculously, set apart from birth, who defeated enemies in his death more than his life, parallels Christ\'s own death and resurrection. The entire book cries out for a perfect King who doesn\'t fail, doesn\'t compromise, and doesn\'t abandon the people. Jesus is that King.',
    application: 'The cycle in Judges is the cycle in every heart: we drift, we suffer, we cry out, we\'re rescued, we forget. The solution isn\'t trying harder — it\'s letting the true King reign in every area. Don\'t wait for the consequences. Turn back now.',
  },

  Ruth: {
    author: 'Unknown — possibly Samuel', when: '~1000 BC, set during the period of the Judges', audience: 'Israel, showing that God\'s grace reaches the nations',
    bigIdea: 'Loyal love — hesed — is the heartbeat of God\'s character, and it crosses every border: race, poverty, and loss.',
    context: 'Ruth is placed directly after Judges — intentionally. Judges ends in darkness; Ruth is a ray of light. A Moabite widow follows her mother-in-law Naomi back to Israel out of pure love. A wealthy kinsman-redeemer named Boaz notices her faithfulness and extends extraordinary grace. The story is intimate, beautiful, and quietly one of the most important in all of Scripture — because Ruth becomes the great-grandmother of King David, and thus an ancestor of Jesus.',
    themes: ['Hesed — loyal, covenant love that goes beyond duty', 'The kinsman-redeemer — someone who buys back what was lost', 'God\'s providence in ordinary life', 'Grace to the outsider — God\'s heart for the nations'],
    outline: [
      { section: 'Naomi\'s Loss — Emptiness in Moab', chapters: '1' },
      { section: 'Ruth Gleans in Boaz\'s Field — Providence', chapters: '2' },
      { section: 'Ruth at the Threshing Floor — Proposal', chapters: '3' },
      { section: 'Boaz Redeems Ruth — Redemption and New Life', chapters: '4' },
    ],
    keyVerses: [
      { ref: 'Ruth 1:16', text: 'Where you go I will go, and where you stay I will stay. Your people will be my people and your God my God.' },
      { ref: 'Ruth 2:12', text: 'May the LORD repay you for what you have done. May you be richly rewarded by the LORD, the God of Israel, under whose wings you have come to take refuge.' },
      { ref: 'Ruth 4:14', text: 'Praise be to the LORD, who this day has not left you without a guardian-redeemer.' },
    ],
    christConnection: 'Boaz is the clearest picture of Christ as kinsman-redeemer in the entire OT. He had every right to let Ruth go, but he chose to pay the price to redeem her — not because he had to, but because of love. This is exactly what Jesus does for us: He sees us in our poverty and loss, and willingly bears the cost to bring us home. Ruth — a Gentile outsider — becomes part of the lineage of the Messiah. That\'s the gospel.',
    application: 'You are Ruth. You had nothing to offer. You came from the wrong background. And the Kinsman-Redeemer saw you, chose you, and covered you. Rest under His wings.',
  },

  '1 Samuel': {
    author: 'Unknown — possibly Samuel, Nathan, and Gad', when: '~930 BC, covering events ~1100–1010 BC', audience: 'Israel transitioning from theocracy to monarchy',
    bigIdea: 'God evaluates differently than man — He looks at the heart — and the right king must be a man after God\'s own heart.',
    context: 'Israel demands a king "like the nations." God warns them what a king will cost — but grants their request. Saul begins with promise and ends in paranoid failure. Meanwhile God is raising up a shepherd boy from Bethlehem. The contrast between Saul (gifted but disobedient) and David (imperfect but repentant) is the spine of the book. Samuel bridges the era of the judges and the monarchy, anointing both.',
    themes: ['Obedience is better than sacrifice', 'The heart matters more than appearance or status', 'God\'s sovereignty in raising up and bringing down leaders', 'Friendship — David and Jonathan'],
    outline: [
      { section: 'Samuel — The Last Judge and First Prophet', chapters: '1–7' },
      { section: 'Saul — Israel\'s First King', chapters: '8–15' },
      { section: 'David Anointed — The Rise of the True King', chapters: '16–17' },
      { section: 'David Hunted — Life in the Shadow', chapters: '18–31' },
    ],
    keyVerses: [
      { ref: '1 Samuel 2:2', text: 'There is no one holy like the LORD; there is no one besides you; there is no Rock like our God.' },
      { ref: '1 Samuel 15:22', text: 'Does the LORD delight in burnt offerings and sacrifices as much as in obeying the LORD? To obey is better than sacrifice.' },
      { ref: '1 Samuel 16:7', text: 'The LORD does not look at the things people look at. People look at the outward appearance, but the LORD looks at the heart.' },
      { ref: '1 Samuel 17:45', text: 'You come against me with sword and spear and javelin, but I come against you in the name of the LORD Almighty.' },
    ],
    christConnection: 'David is the prototype of Christ the King — anointed, despised, hunted, then exalted. The covenant God makes with David in 2 Samuel 7 (coming here as background) promises an eternal throne. Jesus is "the Son of David" — the fulfillment of every promise made to David. David\'s victory over Goliath is a picture of Christ defeating the enemy on behalf of His people, who could not save themselves.',
    application: 'God sees what no one else can see. Your hidden faithfulness, your private worship, your quiet obedience in obscurity — He sees it all. The shepherd field is where the King is formed.',
  },

  '2 Samuel': {
    author: 'Unknown — possibly Nathan and Gad', when: '~930 BC, covering events ~1010–970 BC', audience: 'Israel under David\'s reign',
    bigIdea: 'David is a man after God\'s own heart — not because he never sinned, but because he always returned to God. The covenant God makes with him changes everything.',
    context: 'David becomes king. He unifies Israel, captures Jerusalem, and brings the Ark of the Covenant to the city. Then at the height of his power, he falls catastrophically — adultery with Bathsheba, murder of Uriah. The rest of his reign is marked by family tragedy and rebellion. But God never breaks His covenant with David. 2 Samuel 7 — God\'s covenant with David promising an eternal throne — is the fulcrum of the entire OT.',
    themes: ['The Davidic Covenant — an eternal kingdom', 'Grace to the broken — even to adulterers and murderers', 'Sin always has consequences, even after forgiveness', 'True repentance — David\'s Psalm 51 response'],
    outline: [
      { section: 'David Crowned — United Kingdom Established', chapters: '1–10' },
      { section: 'The Great Sin — Bathsheba and Uriah', chapters: '11–12' },
      { section: 'Consequences — Family Destruction and Rebellion', chapters: '13–20' },
      { section: 'Appendices — Psalms, Heroes, and Census', chapters: '21–24' },
    ],
    keyVerses: [
      { ref: '2 Samuel 7:12–13', text: 'I will raise up your offspring to succeed you... and I will establish his kingdom. He is the one who will build a house for my Name, and I will establish the throne of his kingdom forever.' },
      { ref: '2 Samuel 11:4', text: 'Then David sent messengers to get her. She came to him, and he slept with her.' },
      { ref: '2 Samuel 12:13', text: 'Then David said to Nathan, "I have sinned against the LORD." Nathan replied, "The LORD has taken away your sin."' },
      { ref: '2 Samuel 22:3', text: 'My God is my rock, in whom I take refuge, my shield and the horn of my salvation.' },
    ],
    christConnection: 'God\'s covenant with David (ch 7) is the promise that sits behind every Messianic prophecy in the OT. "His kingdom will endure forever" could not be fulfilled by Solomon — or any human king. It awaited the Son of David who would rule forever. Luke\'s birth narrative quotes this passage directly: "He will reign over Jacob\'s descendants forever; his kingdom will never end" (Luke 1:32–33). Jesus is everything David pointed to.',
    application: 'David\'s greatest sin was followed by his deepest worship (Psalm 51). God\'s covenant with you isn\'t based on your performance. Repentance is not a humiliation — it\'s a return to a Father who never stopped loving you.',
  },

  '1 Kings': {
    author: 'Unknown — Jewish tradition attributes it to Jeremiah', when: '~550 BC, covering events ~970–852 BC', audience: 'Israel and Judah in the divided kingdom era',
    bigIdea: 'Obedience brings blessing; idolatry brings disaster — and even the wisest man in the world can shipwreck on sexual sin and compromised worship.',
    context: '1 Kings opens with Solomon\'s brilliant reign — the Temple is built, God\'s glory fills it, and wisdom flows from Jerusalem. But Solomon\'s foreign wives turn his heart. After his death, the kingdom tears in two: Israel (North) and Judah (South). The northern kings are uniformly evil. Elijah the prophet appears, standing alone against King Ahab and his wickedness. The book ends with Elijah\'s flight into the wilderness — exhausted, alone, wanting to die.',
    themes: ['Wisdom — its glory and its limits', 'The Temple — God\'s presence among His people', 'The divided kingdom — sin\'s political consequences', 'Elijah — the prophetic voice against evil'],
    outline: [
      { section: 'Solomon — Wisdom, Temple, and Failure', chapters: '1–11' },
      { section: 'The Kingdom Divided', chapters: '12' },
      { section: 'The Northern Kings — Jeroboam to Ahab', chapters: '13–16' },
      { section: 'Elijah and Ahab', chapters: '17–22' },
    ],
    keyVerses: [
      { ref: '1 Kings 3:9', text: 'So give your servant a discerning heart to govern your people and to distinguish between right and wrong.' },
      { ref: '1 Kings 8:27', text: 'But will God really dwell on earth? The heavens, even the highest heaven, cannot contain you.' },
      { ref: '1 Kings 18:21', text: 'How long will you waver between two opinions? If the LORD is God, follow him; but if Baal is God, follow him.' },
      { ref: '1 Kings 19:12', text: 'After the earthquake came a fire, but the LORD was not in the fire. And after the fire came a gentle whisper.' },
    ],
    christConnection: 'Solomon\'s Temple, built with such glory, was a shadow of what was coming. Jesus declared "something greater than Solomon is here" (Matt 12:42). He also said "Destroy this temple and in three days I will raise it again" — speaking of His body (John 2:19). Jesus is the true Temple — the place where heaven and earth meet. Elijah\'s ministry of calling Israel back to God pointed forward to John the Baptist, who came "in the spirit and power of Elijah" (Luke 1:17).',
    application: 'You can have wisdom and still lose your heart. Guard what you love. The gentle whisper after Elijah\'s exhaustion is the voice that still speaks — God meets you in the cave, not just on the mountain.',
  },

  '2 Kings': {
    author: 'Unknown — Jewish tradition attributes it to Jeremiah', when: '~550 BC, covering events ~852–586 BC', audience: 'Israel and Judah in exile and approaching exile',
    bigIdea: 'No nation — not even God\'s chosen people — can ignore Him indefinitely. But even in judgment, God preserves a remnant and keeps His promises.',
    context: '2 Kings covers the slow death of both kingdoms. Israel (North) falls to Assyria in 722 BC. Judah (South) limps along for another century with a few good kings — Hezekiah, Josiah — but ultimately falls to Babylon in 586 BC. Jerusalem is destroyed, the Temple is burned, and the people are taken into exile. Elisha continues Elijah\'s ministry with remarkable miracles. The book is a long, painful demonstration of what happens when a nation abandons God.',
    themes: ['The cost of persistent unfaithfulness', 'The prophetic word always comes true', 'Remnant faith — even in dark times', 'Hezekiah\'s prayer — God responds to humble dependence'],
    outline: [
      { section: 'Elisha\'s Ministry — Miracles and War', chapters: '1–8' },
      { section: 'The Fall of Israel — Assyrian Conquest', chapters: '9–17' },
      { section: 'Hezekiah and Josiah — Last Good Kings of Judah', chapters: '18–23' },
      { section: 'The Fall of Jerusalem — Babylonian Exile', chapters: '24–25' },
    ],
    keyVerses: [
      { ref: '2 Kings 2:11', text: 'As they were walking along and talking together, suddenly a chariot of fire and horses of fire appeared and separated the two of them, and Elijah went up to heaven in a whirlwind.' },
      { ref: '2 Kings 17:7', text: 'All this took place because the Israelites had sinned against the LORD their God.' },
      { ref: '2 Kings 19:15', text: 'LORD, the God of Israel, enthroned between the cherubim, you alone are God over all the kingdoms of the earth.' },
      { ref: '2 Kings 22:19', text: 'Because your heart was responsive and you humbled yourself before the LORD... I have heard you, declares the LORD.' },
    ],
    christConnection: 'Elisha\'s ministry foreshadows Jesus in striking ways: he raises the dead (4:32–37), feeds a crowd with limited food (4:42–44), heals a leper (5:1–14), and makes an axe head float. Jesus noted that Elisha bypassed many lepers in Israel to heal Naaman the Syrian — a pointed reminder that God\'s grace has always reached beyond Israel. The exile to Babylon sets the stage for Israel\'s desperate need for a Savior who can do what no king could.',
    application: 'Hezekiah spread his problem before God in prayer and God answered (ch 19). That\'s still available to you. Whatever empire is threatening you — lay it before the Lord. He\'s still on the throne.',
  },

  '1 Chronicles': {
    author: 'Ezra (Jewish tradition)', when: '~450–400 BC', audience: 'Jews returning from Babylonian exile',
    bigIdea: 'God\'s covenant with David is the foundation of hope for a restored Israel — worship is the center of everything.',
    context: '1 Chronicles covers much of the same history as Samuel and Kings, but written from a priestly perspective for a post-exilic community. The Chronicler skips Saul almost entirely and focuses on David — specifically his preparations for the Temple and the worship system. The emphasis is pastoral: this returning community needs to remember their identity, their genealogy, and their calling to worship.',
    themes: ['Worship as the center of national life', 'The Davidic lineage and its importance', 'God\'s covenant faithfulness across generations', 'The Temple — building what God desires'],
    outline: [
      { section: 'Genealogies — From Adam to the Return', chapters: '1–9' },
      { section: 'Saul\'s Death and David\'s Rise', chapters: '10–12' },
      { section: 'The Ark Brought to Jerusalem', chapters: '13–16' },
      { section: 'God\'s Covenant with David', chapters: '17' },
      { section: 'David\'s Preparations for the Temple', chapters: '18–29' },
    ],
    keyVerses: [
      { ref: '1 Chronicles 16:11', text: 'Look to the LORD and his strength; seek his face always.' },
      { ref: '1 Chronicles 16:34', text: 'Give thanks to the LORD, for he is good; his love endures forever.' },
      { ref: '1 Chronicles 17:14', text: 'I will set him over my house and my kingdom forever; his throne will be established forever.' },
      { ref: '1 Chronicles 29:14', text: 'But who am I, and who are my people, that we should be able to give as generously as this? Everything comes from you, and we have given you only what comes from your hand.' },
    ],
    christConnection: 'The Chronicler\'s retelling climaxes with the Davidic Covenant (ch 17) — the promise of an eternal throne. Every genealogy in Chronicles ultimately points to the One in whom all the promises are "Yes and Amen" (2 Cor 1:20). Matthew\'s Gospel begins with a genealogy tracing Jesus back through this very lineage, declaring: "This is the fulfillment of everything Chronicles was waiting for."',
    application: 'The genealogies are not boring — they\'re a declaration that God is faithful across centuries. Your life is part of a story that started long before you and will continue long after. You are not an accident. You are in the lineage of purpose.',
  },

  '2 Chronicles': {
    author: 'Ezra (Jewish tradition)', when: '~450–400 BC', audience: 'Jews returning from Babylonian exile',
    bigIdea: 'Repentance and humility unlock God\'s mercy — no matter how far a king or nation has fallen.',
    context: '2 Chronicles continues from 1 Chronicles, covering Solomon\'s reign and the entire southern kingdom of Judah through the exile and the decree of Cyrus. The Chronicler is selective: he emphasizes the revivals under good kings — Asa, Jehoshaphat, Hezekiah, Josiah — and uses them to show the pattern: seek God and prosper; forsake Him and fall. The famous verse of 7:14 is the theological heartbeat of the book.',
    themes: ['Repentance — "If my people... will humble themselves"', 'Temple worship as the axis of national life', 'Revival under godly kings', 'God\'s discipline is not rejection'],
    outline: [
      { section: 'Solomon — Temple Built and Dedicated', chapters: '1–9' },
      { section: 'The Divided Kingdom — Judah\'s Kings', chapters: '10–28' },
      { section: 'Hezekiah\'s Revival', chapters: '29–32' },
      { section: 'Manasseh\'s Repentance and Josiah\'s Reform', chapters: '33–35' },
      { section: 'The Exile and Cyrus\'s Decree', chapters: '36' },
    ],
    keyVerses: [
      { ref: '2 Chronicles 7:14', text: 'If my people, who are called by my name, will humble themselves and pray and seek my face and turn from their wicked ways, then I will hear from heaven, and I will forgive their sin and will heal their land.' },
      { ref: '2 Chronicles 15:2', text: 'The LORD is with you when you are with him. If you seek him, he will be found by you, but if you forsake him, he will forsake you.' },
      { ref: '2 Chronicles 20:12', text: 'We do not know what to do, but our eyes are on you.' },
      { ref: '2 Chronicles 36:23', text: 'The LORD, the God of heaven, has given me all the kingdoms of the earth and he has appointed me to build a temple for him at Jerusalem in Judah.' },
    ],
    christConnection: '2 Chronicles ends not with exile but with hope: Cyrus\'s decree allowing the Jews to return. This remnant returning from exile is a foretaste of the ultimate homecoming Jesus provides. The Temple they rebuild is the one Jesus will walk into, overturn tables in, and declare "my Father\'s house." He is the Temple\'s fulfillment — the place where heaven and earth truly meet.',
    application: '2 Chronicles 7:14 is still God\'s invitation. Humility, prayer, and repentance are not signs of weakness — they are the pathway to healing. It starts with the people of God. It starts with you.',
  },

  Ezra: {
    author: 'Ezra', when: '~450–400 BC', audience: 'The Jewish community returning from Babylonian exile',
    bigIdea: 'God keeps His word — He stirs pagan kings to send His people home, and He calls them to holiness in the land of promise.',
    context: 'After 70 years of Babylonian exile — exactly as Jeremiah prophesied — Cyrus the Great of Persia issues a decree allowing the Jews to return to Jerusalem. Ezra covers two returns: Zerubbabel\'s first wave (chs 1–6) to rebuild the Temple, and Ezra\'s second wave (chs 7–10) to restore the Law. The books of Ezra and Nehemiah were originally one scroll. Ezra is a priest and scribe on fire for God\'s Word.',
    themes: ['God\'s sovereignty over world empires', 'The Word of God as the source of reformation', 'Holiness — separation from compromise', 'God keeps His prophetic promises'],
    outline: [
      { section: 'First Return — Zerubbabel Leads the People Home', chapters: '1–2' },
      { section: 'The Temple Rebuilt Against Opposition', chapters: '3–6' },
      { section: 'Second Return — Ezra Arrives with the Law', chapters: '7–8' },
      { section: 'The Crisis of Intermarriage — Confession and Reform', chapters: '9–10' },
    ],
    keyVerses: [
      { ref: 'Ezra 1:1', text: 'In the first year of Cyrus king of Persia, in order to fulfill the word of the LORD spoken by Jeremiah, the LORD moved the heart of Cyrus.' },
      { ref: 'Ezra 7:10', text: 'For Ezra had devoted himself to the study and observance of the Law of the LORD, and to teaching its decrees and laws in Israel.' },
      { ref: 'Ezra 9:6', text: 'I am too ashamed and disgraced, my God, to lift up my face to you, because our sins are higher than our heads and our guilt has reached to the heavens.' },
    ],
    christConnection: 'Cyrus — a pagan king who never knew God — is called God\'s "anointed" (mashiach / messiah) in Isaiah 45:1, the only non-Israelite to receive this title. God uses whomever He chooses. The rebuilt Temple that Ezra returns to is the one Jesus would enter. Ezra\'s prayer of confession in chapter 9 shows the same posture of intercession that Jesus makes as our great High Priest — standing in the gap for a broken people.',
    application: 'Ezra\'s secret was simple: he devoted himself to knowing God\'s Word, living it, and teaching it (7:10). In that order. You can\'t teach what you don\'t live. You can\'t live what you don\'t know.',
  },

  Nehemiah: {
    author: 'Nehemiah', when: '~445–420 BC', audience: 'The Jewish community in Jerusalem after the return from exile',
    bigIdea: 'Prayer and hard work together — when God calls you to rebuild, He gives you both the vision and the resilience to finish it.',
    context: 'Nehemiah is the king\'s cupbearer in Persia — a high-ranking, trusted official. He hears that Jerusalem\'s walls are broken and its people are in disgrace. He weeps, prays, and then takes bold action. He gets permission from the king, arrives in Jerusalem, and in 52 days the wall is rebuilt despite fierce opposition. The book is a masterclass in leadership: prayer, planning, perseverance, and dealing with opposition without compromise.',
    themes: ['Prayer as the first response to every crisis', 'Leadership — vision, courage, and sacrifice', 'Finishing what God starts through you', 'Worship and the Word as foundations of community'],
    outline: [
      { section: 'Nehemiah\'s Prayer and Commission from the King', chapters: '1–2' },
      { section: 'The Wall Built — Despite Plots and Threats', chapters: '3–6' },
      { section: 'The Wall Complete — 52 Days', chapters: '6:15' },
      { section: 'Ezra Reads the Law — Covenant Renewal', chapters: '7–10' },
      { section: 'Repopulating Jerusalem and Final Reforms', chapters: '11–13' },
    ],
    keyVerses: [
      { ref: 'Nehemiah 1:4', text: 'When I heard these things, I sat down and wept. For some days I mourned and fasted and prayed before the God of heaven.' },
      { ref: 'Nehemiah 2:4–5', text: 'The king said to me, "What is it you want?" Then I prayed to the God of heaven, and I answered the king...' },
      { ref: 'Nehemiah 6:3', text: 'I am carrying on a great project and cannot go down. Why should the work stop while I leave it and go down to you?' },
      { ref: 'Nehemiah 8:10', text: 'The joy of the LORD is your strength.' },
    ],
    christConnection: 'Nehemiah\'s intercession for a broken city mirrors Christ\'s intercession for us. He left a position of comfort and security to enter a place of ruin and rebuild it — at personal cost. The city of Jerusalem being restored physically points to the ultimate restoration Jesus will bring: a New Jerusalem where there are no broken walls, no enemies, and no shame (Revelation 21).',
    application: 'When you see a need that moves you to tears, that\'s often your calling. Pray first. Then show up with a plan. Nehemiah didn\'t wait for someone else to fix it. The wall was rebuilt one section at a time.',
  },

  Esther: {
    author: 'Unknown', when: '~480–470 BC, set during the reign of King Xerxes I of Persia', audience: 'Jewish diaspora in Persia and throughout the empire',
    bigIdea: 'God is sovereignly at work even when His name is never mentioned — and He places His people in strategic positions for such a time as this.',
    context: 'Esther is one of only two books in the Bible that never mention God by name (Song of Solomon is the other). Yet God\'s fingerprints are everywhere. A Jewish girl becomes queen of Persia. A genocidal official named Haman plots to kill every Jew in the empire. A series of "coincidences" unfolds that saves the Jewish people. The story is a master class in providence — God working through ordinary people in ordinary circumstances to do extraordinary things.',
    themes: ['Providence — God\'s invisible hand in every "coincidence"', 'Courage — "if I perish, I perish"', 'God\'s protection of the Jewish people', 'Purim — the feast that remembers deliverance'],
    outline: [
      { section: 'Esther Becomes Queen', chapters: '1–2' },
      { section: 'Haman\'s Plot to Destroy the Jews', chapters: '3' },
      { section: 'Mordecai\'s Challenge to Esther', chapters: '4' },
      { section: 'Esther\'s Courage — She Goes to the King', chapters: '5–7' },
      { section: 'The Jews Saved — Purim Established', chapters: '8–10' },
    ],
    keyVerses: [
      { ref: 'Esther 4:14', text: 'And who knows but that you have come to your royal position for such a time as this?' },
      { ref: 'Esther 4:16', text: 'I will go to the king, even though it is against the law. And if I perish, I perish.' },
      { ref: 'Esther 6:1', text: 'That night the king could not sleep; so he ordered the book of the chronicles, the record of his reign, to be brought in and read to him.' },
    ],
    christConnection: 'Esther\'s willingness to enter the presence of the king — risking her life — to intercede for her people is a picture of Christ, our Great High Priest who enters the presence of the Father on our behalf. Mordecai\'s elevation from obscurity to second in the kingdom mirrors Joseph\'s story and ultimately points to Christ\'s exaltation. The Jewish people\'s preservation is essential — through them the Messiah must come.',
    application: 'You are not in your position, your family, your city, or your moment by accident. God has placed you there. The question Mordecai asks Esther is the question God asks you: will you act for such a time as this? Courage and faith are required.',
  },

  Proverbs: {
    author: 'Solomon (primarily), with contributions from Agur and Lemuel\'s mother', when: '~950–700 BC', audience: 'Young people learning to live wisely in God\'s world',
    bigIdea: 'Wisdom is not just knowledge — it is the skill of living life well, rooted in the fear of the LORD.',
    context: 'Proverbs is ancient Israel\'s wisdom curriculum, built for the formation of character from youth. It opens with a parent\'s urgent instruction: get wisdom above all else. Lady Wisdom cries out in the streets; Folly seduces from her doorway. The bulk of the book consists of Solomon\'s collected sayings — short, punchy, memorable truths about money, words, work, relationships, and the tongue. It ends with the famous portrait of the excellent wife (Prov 31).',
    themes: ['The fear of the LORD — where wisdom begins', 'The power of words — death and life are in the tongue', 'Diligence vs. laziness', 'The wise vs. the fool — two paths, two destinations'],
    outline: [
      { section: 'The Purpose of Wisdom — Prologue', chapters: '1–9' },
      { section: 'Solomon\'s First Collection — Short Sayings', chapters: '10–22' },
      { section: 'The Thirty Sayings of the Wise', chapters: '22–24' },
      { section: 'Solomon\'s Second Collection — Hezekiah\'s Compilation', chapters: '25–29' },
      { section: 'Words of Agur and King Lemuel\'s Mother', chapters: '30–31' },
    ],
    keyVerses: [
      { ref: 'Proverbs 1:7', text: 'The fear of the LORD is the beginning of wisdom, but fools despise wisdom and instruction.' },
      { ref: 'Proverbs 3:5–6', text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.' },
      { ref: 'Proverbs 4:23', text: 'Above all else, guard your heart, for everything you do flows from it.' },
      { ref: 'Proverbs 18:21', text: 'The tongue has the power of life and death, and those who love it will eat its fruit.' },
    ],
    christConnection: 'Proverbs 8 personifies Wisdom — present at creation, delighting before God, the craftsman at His side. The NT applies this to Jesus: "In the beginning was the Word" (John 1:1). Paul calls Jesus "the wisdom of God" (1 Cor 1:24, 30). The excellent wife of Proverbs 31 has been read as a portrait of the church — the bride of Christ. Every proverb about the wise man is ultimately a portrait of Jesus, the one person who perfectly lived this wisdom.',
    application: 'Every decision you make flows from what you\'ve allowed to shape your heart. Guard it. Feed it with truth. The fear of the LORD — a reverent, joyful awe of who God is — is not the beginning of misery. It is the beginning of the wisest, richest life available.',
  },

  Ecclesiastes: {
    author: 'Qohelet — "the Preacher" or "the Teacher"; identified with Solomon', when: '~935–900 BC', audience: 'Anyone searching for meaning in a world that doesn\'t always make sense',
    bigIdea: '"Vanity of vanities" — life without God is empty. But fear God, enjoy His gifts, and trust Him with what you can\'t control.',
    context: 'Ecclesiastes is the most honest book in the Bible. The Preacher tries everything — wisdom, pleasure, work, wealth, achievement — and finds it all hollow "under the sun" (a phrase meaning: from a purely human perspective). This is not cynicism for its own sake. It is a diagnosis: without God at the center, nothing satisfies. The conclusion is not despair but surrender — fear God, obey His commands, and receive life as the gift it is.',
    themes: ['The vanity (hebel — "vapor") of life without God', 'Enjoyment as gift — receive what God gives', 'The limits of human wisdom and effort', 'God will judge — so live accordingly'],
    outline: [
      { section: 'The Thesis — Everything is Vanity', chapters: '1–2' },
      { section: 'Time, Toil, and the Limits of Wisdom', chapters: '3–5' },
      { section: 'The Injustice of Life "Under the Sun"', chapters: '6–8' },
      { section: 'Enjoy Life While You Can — Death Comes for All', chapters: '9–11' },
      { section: 'Remember Your Creator — The Conclusion', chapters: '12' },
    ],
    keyVerses: [
      { ref: 'Ecclesiastes 1:2', text: '"Meaningless! Meaningless!" says the Teacher. "Utterly meaningless! Everything is meaningless."' },
      { ref: 'Ecclesiastes 3:11', text: 'He has made everything beautiful in its time. He has also set eternity in the human heart; yet no one can fathom what God has done from beginning to end.' },
      { ref: 'Ecclesiastes 5:2', text: 'Do not be quick with your mouth, do not be hasty in your heart to utter anything before God. God is in heaven and you are on earth, so let your words be few.' },
      { ref: 'Ecclesiastes 12:13', text: 'Fear God and keep his commandments, for this is the duty of all mankind.' },
    ],
    christConnection: 'Ecclesiastes 3:11 says God has set "eternity in the human heart" — explaining the ache that no earthly thing can fill. Jesus is the answer to that ache. He is the one who turns vapor into substance, vanity into meaning. Paul writes: "For to me, to live is Christ" (Phil 1:21) — the exact opposite of Ecclesiastes\' despair. When Christ is the center, the emptiness the Preacher documented finally has its answer.',
    application: 'The restlessness you feel? Augustine named it: "Our heart is restless until it rests in Thee." Stop trying to fill God-shaped space with things that can\'t hold it. Receive today as a gift. Fear God. Enjoy what He gives.',
  },

  'Song of Solomon': {
    author: 'Solomon', when: '~950 BC', audience: 'Israel; God\'s people across the ages',
    bigIdea: 'Human romantic love — passionate, exclusive, and faithful — is both a gift from God and a picture of His love for His people.',
    context: 'Song of Solomon (also called Song of Songs, meaning "the greatest song") is the most unique book in the Bible — a collection of love poetry between a groom and his bride. It was hotly debated before being included in the canon. Rabbi Akiva declared it "the Holy of Holies." The church has historically read it on two levels: the literal celebration of marital love, and the allegorical picture of Christ\'s love for the church.',
    themes: ['The beauty and holiness of marital love', 'Desire — God-designed and good', 'Exclusive devotion — "I am my beloved\'s and he is mine"', 'The glory of the beloved in the eyes of love'],
    outline: [
      { section: 'The Bride\'s Longing and the First Meeting', chapters: '1–2' },
      { section: 'Seeking and Finding — the Beloved', chapters: '3' },
      { section: 'The Wedding and Consummation', chapters: '4–5' },
      { section: 'Separation and Reunion', chapters: '5–7' },
      { section: 'Love That Cannot Be Quenched', chapters: '8' },
    ],
    keyVerses: [
      { ref: 'Song of Solomon 2:16', text: 'My beloved is mine and I am his.' },
      { ref: 'Song of Solomon 6:3', text: 'I am my beloved\'s and my beloved is mine.' },
      { ref: 'Song of Solomon 8:6–7', text: 'Place me like a seal over your heart... for love is as strong as death... Many waters cannot quench love; rivers cannot sweep it away.' },
    ],
    christConnection: 'Paul applies this imagery directly to Christ and the church (Ephesians 5:25–32) — "this is a profound mystery, but I am talking about Christ and the church." The jealous, exclusive, passionate love of the groom for his bride mirrors God\'s covenant love for Israel (Hosea, Ezekiel 16) and Christ\'s love for the church. Revelation 19 calls the church "the bride of Christ." The Song is a preview of the greatest love story in history.',
    application: 'Your longing for love is not a weakness — it is a signpost. The love described in this book is the love God has for you in Christ. You are seen. You are desired. You are His.',
  },

  Jeremiah: {
    author: 'Jeremiah, son of Hilkiah; scribal help from Baruch', when: '~627–585 BC', audience: 'Judah in the final decades before the Babylonian destruction of Jerusalem',
    bigIdea: 'Even when judgment is certain, God\'s heart breaks for His people — and He promises a New Covenant that will change them from the inside.',
    context: 'Jeremiah prophesied for 40 years to a people who never listened. He watched Jerusalem fall, the Temple burn, and his people dragged into exile. He wept constantly — earning the title "the weeping prophet." He was thrown into a cistern, imprisoned, beaten, and rejected. Yet he kept preaching. In the midst of all the judgment oracles, he wrote the most profound promise in the OT: a New Covenant written on hearts, not tablets.',
    themes: ['Judgment — God\'s grief over persistent rebellion', 'The New Covenant — God\'s ultimate solution to sin', 'The faithful prophet — suffering for truth', 'God\'s plans for a future and a hope'],
    outline: [
      { section: 'Jeremiah\'s Call and Early Prophecies', chapters: '1–6' },
      { section: 'Temple Sermon and Increasing Opposition', chapters: '7–20' },
      { section: 'The Fall of Jerusalem — Prophecies and History', chapters: '21–39' },
      { section: 'After the Fall — Lament and Consolation', chapters: '40–45' },
      { section: 'Oracles Against the Nations', chapters: '46–51' },
      { section: 'Historical Appendix — Jerusalem\'s Destruction', chapters: '52' },
    ],
    keyVerses: [
      { ref: 'Jeremiah 1:5', text: 'Before I formed you in the womb I knew you, before you were born I set you apart.' },
      { ref: 'Jeremiah 17:9', text: 'The heart is deceitful above all things and beyond cure. Who can understand it?' },
      { ref: 'Jeremiah 29:11', text: '"For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future."' },
      { ref: 'Jeremiah 31:33', text: '"I will put my law in their minds and write it on their hearts. I will be their God, and they will be my people."' },
    ],
    christConnection: 'Jeremiah 31:31–34 is the most important promise in the Old Testament — the New Covenant. Jesus picks up this very cup at the Last Supper: "This cup is the new covenant in my blood" (Luke 22:20). Every promise of the New Covenant is fulfilled in Jesus: sins forgiven, God\'s law written on the heart, the Spirit given. Hebrews 8–10 is entirely an exposition of how Jesus fulfills Jeremiah\'s New Covenant promise.',
    application: 'Jeremiah 29:11 is not a promise that life will be easy — it was written to people in exile. It\'s a promise that God\'s plan for you is redemptive, not punitive. The exile is not the end. Plans for a future and a hope are still active.',
  },

  Lamentations: {
    author: 'Jeremiah (traditionally)', when: '~586 BC — written immediately after Jerusalem\'s destruction', audience: 'The survivors of Jerusalem\'s fall',
    bigIdea: 'Honest grief is not faithlessness — God can hold your deepest lament, and even in the ruins, His mercies are new every morning.',
    context: 'Lamentations is five poems of grief written in the ashes of Jerusalem. The Temple is gone. The city is in ruins. People starved to death; mothers ate their own children. Jeremiah — if he is the author — sits in the rubble and weeps. The poems are acrostics (each verse begins with a successive letter of the Hebrew alphabet) — a literary structure suggesting that every possible word of grief, from A to Z, is being poured out before God.',
    themes: ['Honest lament — God welcomes our grief', 'The consequences of sin are real', 'God\'s faithfulness in the darkest hour', 'Hope that surfaces slowly, not quickly'],
    outline: [
      { section: 'The Desolation of Jerusalem', chapters: '1' },
      { section: 'God\'s Wrath and the Ruins', chapters: '2' },
      { section: 'The Prophet\'s Grief and Hope', chapters: '3' },
      { section: 'The Siege and Its Horror', chapters: '4' },
      { section: 'Prayer for Restoration', chapters: '5' },
    ],
    keyVerses: [
      { ref: 'Lamentations 1:1', text: 'How deserted lies the city, once so full of people!' },
      { ref: 'Lamentations 3:22–23', text: 'Because of the LORD\'s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.' },
      { ref: 'Lamentations 3:26', text: 'It is good to wait quietly for the salvation of the LORD.' },
      { ref: 'Lamentations 3:40', text: 'Let us examine our ways and test them, and let us return to the LORD.' },
    ],
    christConnection: 'The suffering described in Lamentations — the innocent dying, the holy place destroyed, God seemingly absent — all foreshadow the cross. Jesus on the cross quotes from the Psalms of lament (Ps 22). He wept over Jerusalem (Luke 19:41), seeing what Jeremiah saw: a city that killed its prophets. He went to the cross knowing what abandonment felt like. God in Christ has entered the ruins. He is not a distant observer of our grief.',
    application: 'The most hope-filled verse in the Bible (Lam 3:22–23) was written in the worst moment of Israel\'s history. Great is His faithfulness — even here. Especially here. The ruins are not the final word.',
  },

  Ezekiel: {
    author: 'Ezekiel, priest and prophet', when: '~593–571 BC, written during the Babylonian exile', audience: 'Jewish exiles in Babylon',
    bigIdea: 'God\'s glory departs from a corrupt Temple — but He promises to return, to give His people new hearts, and to dwell among them forever.',
    context: 'Ezekiel is the strangest, most visually intense book in the Bible. It opens with a jaw-dropping vision of God\'s chariot-throne — living creatures, spinning wheels, and blinding light. Ezekiel was taken into exile with the first wave of deportees and prophesied among them. He sees the glory of God depart from the Temple (chs 8–11) — the most terrifying moment in the OT. But the book ends with a vision of God\'s glory returning to a restored Temple.',
    themes: ['The glory of God — departing and returning', 'Judgment on Israel and the nations', 'The valley of dry bones — resurrection and restoration', 'The new heart — God\'s spirit within His people'],
    outline: [
      { section: 'The Vision of God\'s Glory — Ezekiel\'s Call', chapters: '1–3' },
      { section: 'Judgment on Jerusalem and the Temple', chapters: '4–24' },
      { section: 'Oracles Against the Nations', chapters: '25–32' },
      { section: 'Restoration — The Valley of Dry Bones', chapters: '33–39' },
      { section: 'The Vision of the New Temple and Restored Glory', chapters: '40–48' },
    ],
    keyVerses: [
      { ref: 'Ezekiel 11:19–20', text: 'I will give them an undivided heart and put a new spirit in them; I will remove from them their heart of stone and give them a heart of flesh.' },
      { ref: 'Ezekiel 36:26', text: 'I will give you a new heart and put a new spirit in you.' },
      { ref: 'Ezekiel 37:3', text: '"Son of man, can these bones live?" I said, "Sovereign LORD, you alone know."' },
      { ref: 'Ezekiel 47:9', text: 'Where the river flows everything will live.' },
    ],
    christConnection: 'The valley of dry bones (ch 37) is a picture of spiritual resurrection — exactly what Jesus gives. The "new heart" and "new spirit" promises (chs 36–37) are fulfilled in the new birth (John 3) and the indwelling Holy Spirit (John 14:17). John\'s vision of the river flowing from God\'s throne in Revelation 22 draws directly from Ezekiel 47. Jesus is the glory of God who departed the old Temple — and who now dwells in His people as the living Temple.',
    application: 'God promised to replace the heart of stone. If you have felt spiritually dead — dry bones scattered — that\'s the exact situation He specializes in. Can these bones live? "Lord, you alone know." Yes. Yes they can.',
  },

  Daniel: {
    author: 'Daniel', when: '~536 BC, set during the Babylonian and Persian empires (~605–530 BC)', audience: 'Jews living as a minority under hostile pagan rule',
    bigIdea: 'No earthly empire lasts forever — God\'s kingdom will outlast them all, and His people can live faithfully in Babylon without becoming it.',
    context: 'Daniel is taken to Babylon as a teenager during the first deportation. He and three friends immediately face the choice: compromise or conviction. They choose conviction — and God vindicates them spectacularly. The first half of the book (chs 1–6) is narratives of faith under pressure: the fiery furnace, the lions\' den, the handwriting on the wall. The second half (chs 7–12) is apocalyptic visions of the rise and fall of world empires and the ultimate coming of the Son of Man.',
    themes: ['Faithfulness in a hostile culture', 'God\'s sovereignty over world empires', 'The "Son of Man" — the coming heavenly king', 'Prophecy — history written in advance'],
    outline: [
      { section: 'Daniel and Friends — Integrity in Babylon', chapters: '1' },
      { section: 'Nebuchadnezzar\'s Dreams and the Fiery Furnace', chapters: '2–3' },
      { section: 'Nebuchadnezzar\'s Humiliation and Belshazzar\'s Feast', chapters: '4–5' },
      { section: 'The Lions\' Den — Darius the Mede', chapters: '6' },
      { section: 'Daniel\'s Visions — Four Beasts, Son of Man, End Times', chapters: '7–12' },
    ],
    keyVerses: [
      { ref: 'Daniel 1:8', text: 'But Daniel resolved not to defile himself with the royal food and wine.' },
      { ref: 'Daniel 3:17–18', text: 'If we are thrown into the blazing furnace, the God we serve is able to deliver us. But even if he does not... we will not serve your gods.' },
      { ref: 'Daniel 6:22', text: 'My God sent his angel, and he shut the mouths of the lions.' },
      { ref: 'Daniel 7:13–14', text: 'There before me was one like a son of man... He was given authority, glory and sovereign power; all nations and peoples of every language worshiped him.' },
    ],
    christConnection: 'Daniel 7:13–14 is one of the most explosive Messianic prophecies in the Bible — the "Son of Man" coming on the clouds to receive an eternal kingdom. Jesus used this exact title for Himself more than any other — and when the High Priest asked "Are you the Messiah?" Jesus quoted Daniel 7 directly: "You will see the Son of Man coming on the clouds of heaven" (Matt 26:64). This was the statement that sealed His death sentence — because they knew exactly what He was claiming.',
    application: 'Shadrach, Meshach, and Abednego\'s "but even if He does not" is one of the most courageous statements of faith ever spoken. They didn\'t need deliverance to worship. Can you say the same? Faith that only trusts when everything goes right isn\'t faith — it\'s preference.',
  },

  Hosea: {
    author: 'Hosea, son of Beeri', when: '~750–720 BC', audience: 'Israel (the northern kingdom) shortly before its fall to Assyria',
    bigIdea: 'God loves His unfaithful people the way a husband loves an unfaithful wife — with a love that refuses to quit.',
    context: 'God tells Hosea to do something extraordinary: marry a woman who will be unfaithful to him, as a living parable of Israel\'s relationship with God. Hosea\'s wife Gomer leaves him for other lovers. He buys her back. This is Israel — running to false gods, worshiping idols, breaking covenant — and God refusing to let them go. Hosea is perhaps the most emotionally raw picture of God\'s love in the OT.',
    themes: ['God\'s steadfast love — hesed — that refuses to quit', 'Spiritual adultery — idolatry as unfaithfulness', 'Repentance and restoration', 'God\'s grief over His people\'s rejection'],
    outline: [
      { section: 'Hosea\'s Marriage — Israel\'s Unfaithfulness Pictured', chapters: '1–3' },
      { section: 'Israel\'s Sin and God\'s Indictment', chapters: '4–7' },
      { section: 'Judgment Coming — Assyrian Exile', chapters: '8–10' },
      { section: 'God\'s Love Refuses to Let Go', chapters: '11–14' },
    ],
    keyVerses: [
      { ref: 'Hosea 2:23', text: 'I will say to those called "Not my people," "You are my people"; and they will say, "You are my God."' },
      { ref: 'Hosea 6:6', text: 'For I desire mercy, not sacrifice, and acknowledgment of God rather than burnt offerings.' },
      { ref: 'Hosea 11:8', text: 'How can I give you up, Ephraim? How can I hand you over, Israel?... My heart is changed within me; all my compassion is aroused.' },
      { ref: 'Hosea 14:4', text: 'I will heal their waywardness and love them freely, for my anger has turned away from them.' },
    ],
    christConnection: 'Matthew quotes Hosea 11:1 — "Out of Egypt I called my son" — and applies it to Jesus\' return from Egypt (Matt 2:15). Jesus embodies the faithful spouse, the one who never abandons. His purchase of us at the cross is the ultimate "buying back" of Gomer — He paid the full price to redeem an unfaithful people. Paul quotes Hosea 2:23 in Romans 9 to describe the inclusion of Gentiles into God\'s people.',
    application: 'God knows your unfaithfulness. He knows every time you\'ve run from Him. And He says: "I will heal their waywardness and love them freely." This is not a God who gives up. Come home.',
  },

  Joel: {
    author: 'Joel, son of Pethuel', when: 'Uncertain — possibly ~830 BC (early) or ~400 BC (late)', audience: 'Judah, likely in response to a devastating locust plague',
    bigIdea: 'Disaster is God\'s call to repentance — but beyond judgment is the promise of the outpoured Spirit on all people.',
    context: 'A catastrophic locust plague has devastated Judah. Joel uses the disaster as a launch pad for one of the most dramatic calls to repentance in the OT: rend your hearts, not your garments. Beyond the immediate crisis, he sees a greater "Day of the LORD" coming — judgment on the nations. But in the midst of it, God promises to pour out His Spirit on all flesh — sons and daughters, young and old, slave and free.',
    themes: ['Repentance — a whole-hearted return to God', 'The Day of the LORD — judgment and salvation', 'The outpouring of the Holy Spirit', 'Restoration — God restores what the locust ate'],
    outline: [
      { section: 'The Locust Plague — A Call to Lament', chapters: '1' },
      { section: 'The Day of the LORD — Repent Now', chapters: '2:1–17' },
      { section: 'God\'s Response — Restoration Promised', chapters: '2:18–32' },
      { section: 'Judgment on the Nations — Valley of Decision', chapters: '3' },
    ],
    keyVerses: [
      { ref: 'Joel 2:12–13', text: '"Even now," declares the LORD, "return to me with all your heart, with fasting and weeping and mourning." Rend your heart and not your garments.' },
      { ref: 'Joel 2:25', text: 'I will repay you for the years the locusts have eaten.' },
      { ref: 'Joel 2:28', text: 'I will pour out my Spirit on all people. Your sons and daughters will prophesy, your old men will dream dreams, your young men will see visions.' },
      { ref: 'Joel 3:14', text: 'Multitudes, multitudes in the valley of decision! For the day of the LORD is near in the valley of decision.' },
    ],
    christConnection: 'Peter stands up on the Day of Pentecost when the Spirit falls like fire, and quotes Joel 2:28–32: "This is what was spoken by the prophet Joel" (Acts 2:16–21). Pentecost is the fulfillment of Joel\'s promise — the Spirit poured out on all flesh. Every person who has received the Holy Spirit is living in the fulfillment of this ancient prophecy. Jesus is the one who sends the Spirit (John 15:26, 16:7).',
    application: 'God promises to restore what the locusts ate. Whatever season of loss you\'ve been through — the wasted years, the failed relationships, the missed opportunities — restoration is part of God\'s vocabulary. He specializes in it.',
  },

  Amos: {
    author: 'Amos, a shepherd and farmer from Tekoa', when: '~760–750 BC', audience: 'Israel (the northern kingdom) at the height of its prosperity',
    bigIdea: 'Prosperity without justice is an abomination to God — He cares about how the poor are treated as much as how worship is performed.',
    context: 'Amos is a nobody — a shepherd and fig farmer — sent from Judah to preach to the prosperous northern kingdom of Israel during a time of national peace and economic boom. Israel is wealthy, religious, and corrupt. The rich oppress the poor; the courts are bribed; worship is performed while injustice thrives. Amos arrives with a thundering message: God is not fooled by religious activity that coexists with exploitation.',
    themes: ['Social justice — God\'s heart for the poor', 'The hollowness of worship without righteousness', 'Judgment is coming, but there is still time to seek God', 'The Day of the LORD — not the celebration Israel expected'],
    outline: [
      { section: 'Oracles Against the Nations — Then Against Israel', chapters: '1–2' },
      { section: 'Three Sermons of Judgment', chapters: '3–6' },
      { section: 'Five Visions of Judgment', chapters: '7–9' },
      { section: 'Restoration Promise', chapters: '9:11–15' },
    ],
    keyVerses: [
      { ref: 'Amos 3:3', text: 'Do two walk together unless they have agreed to do so?' },
      { ref: 'Amos 5:24', text: 'But let justice roll on like a river, righteousness like a never-failing stream!' },
      { ref: 'Amos 7:14–15', text: 'I was neither a prophet nor the son of a prophet, but I was a shepherd... But the LORD took me from tending the flock and said to me, "Go, prophesy to my people Israel."' },
      { ref: 'Amos 9:11', text: 'In that day I will restore David\'s fallen shelter — I will repair its broken walls and restore its ruins.' },
    ],
    christConnection: 'James quotes Amos 9:11–12 at the Jerusalem Council to support including Gentiles in the church (Acts 15:16–17) — God is restoring David\'s tent, and the nations are coming. Jesus was the fulfillment of this restored Davidic kingdom. The justice God demanded through Amos is ultimately satisfied in the cross: Jesus took on the consequences of injustice — innocent suffering — and will return to set all things right.',
    application: 'Amos 5:24 is still God\'s standard. He doesn\'t want more religious activity — He wants your worship to produce justice in how you treat people. The way you treat the vulnerable is your theology in action.',
  },

  Obadiah: {
    author: 'Obadiah', when: '~585 BC — shortly after the fall of Jerusalem', audience: 'Judah, mourning the destruction of Jerusalem',
    bigIdea: 'Pride goes before destruction — and those who stood by while God\'s people suffered will face the God who never forgets.',
    context: 'Obadiah is the shortest book in the OT — 21 verses entirely against Edom. Edom was descended from Esau, Jacob\'s twin brother — making them Israel\'s closest relatives. When Babylon destroyed Jerusalem, the Edomites not only cheered but actively helped — blocking escape routes and handing over survivors. God through Obadiah declares their judgment. The book ends with a vision of Israel\'s restoration and the LORD\'s kingdom.',
    themes: ['The sin of pride — Edom trusted in its mountain stronghold', 'Betrayal of family — the worst kind of treachery', 'God\'s justice — the nations will be judged', 'The coming kingdom of the LORD'],
    outline: [
      { section: 'Judgment Against Edom', chapters: '1–14' },
      { section: 'The Day of the LORD for All Nations', chapters: '15–16' },
      { section: 'Israel Restored — The Kingdom of the LORD', chapters: '17–21' },
    ],
    keyVerses: [
      { ref: 'Obadiah 3', text: 'The pride of your heart has deceived you, you who live in the clefts of the rocks and make your home on the heights, you who say to yourself, "Who can bring me down to the ground?"' },
      { ref: 'Obadiah 15', text: 'The day of the LORD is near for all nations. As you have done, it will be done to you; your deeds will return upon your own head.' },
      { ref: 'Obadiah 21', text: 'Deliverers will go up on Mount Zion to govern the mountains of Esau. And the kingdom will be the LORD\'s.' },
    ],
    christConnection: 'Obadiah\'s final word is that the kingdom will be the LORD\'s. This is where all the minor prophets are pointing — the ultimate reign of God over all nations. Jesus is that kingdom come in person. The Esau/Jacob conflict that runs from Genesis through Obadiah is resolved in the gospel: both are offered reconciliation in Christ. The descendants of Edom (the Herods) ironically appear in the New Testament — Herod tried to kill the King of kings.',
    application: 'Pride deceives. Every "who can bring me down?" has an answer: God can, and He will. But the flip side is equally true: every "my deliverers will come" also has a God behind it. Humble yourself before the Lord — now, while there is still time.',
  },

  Jonah: {
    author: 'Unknown (Jonah himself, or a later author telling his story)', when: '~760 BC', audience: 'Israel, challenged on the limits of their understanding of God\'s mercy',
    bigIdea: 'God\'s mercy is scandalously broad — He loves even the nations Israel considered enemies — and His servants have no right to limit it.',
    context: 'Jonah is the most surprising book in the OT. A prophet is told to go preach to Nineveh — the brutal capital of the Assyrian Empire, Israel\'s greatest enemy. He runs in the opposite direction, is swallowed by a large fish, repents, and eventually preaches. The city repents. God relents from judgment. And Jonah is furious. The book ends not with a happy hero but with a sulking prophet who would rather see 120,000 people die than see God show mercy to his enemies.',
    themes: ['The breadth of God\'s mercy — it reaches the worst people', 'Running from God always fails', 'Jonah\'s anger mirrors our own selective mercy', 'God cares about "the nations" — always has'],
    outline: [
      { section: 'The Call, the Flee, the Storm, the Fish', chapters: '1' },
      { section: 'The Prayer From the Fish', chapters: '2' },
      { section: 'Nineveh Repents — The Whole City', chapters: '3' },
      { section: 'Jonah\'s Anger and God\'s Rebuke', chapters: '4' },
    ],
    keyVerses: [
      { ref: 'Jonah 1:3', text: 'But Jonah ran away from the LORD and headed for Tarshish.' },
      { ref: 'Jonah 2:9', text: 'Salvation comes from the LORD.' },
      { ref: 'Jonah 3:10', text: 'When God saw what they did and how they turned from their evil ways, he relented and did not bring on them the destruction he had threatened.' },
      { ref: 'Jonah 4:11', text: 'Should I not have concern for the great city of Nineveh, in which there are more than a hundred and twenty thousand people who cannot tell their right hand from their left?' },
    ],
    christConnection: 'Jesus used Jonah as the single sign He offered the Pharisees: "For as Jonah was three days and three nights in the belly of a huge fish, so the Son of Man will be three days and three nights in the heart of the earth" (Matt 12:40). Jonah\'s death and resurrection from the fish prefigures the resurrection. Jesus also said "something greater than Jonah is here" — He is the greater preacher whose words bring life to the spiritually dead.',
    application: 'You are both the runaway prophet and the city of Nineveh. God pursued you, and God is pursuing people you might have written off. His mercy is bigger than your theology. Is there a Nineveh you\'ve been avoiding?',
  },

  Micah: {
    author: 'Micah of Moresheth', when: '~735–700 BC', audience: 'Both Israel (North) and Judah (South)',
    bigIdea: 'God requires justice, mercy, and humility — and from Bethlehem He will send the ruler whose greatness will reach the ends of the earth.',
    context: 'Micah was a contemporary of Isaiah, prophesying during the reigns of Jotham, Ahaz, and Hezekiah. He was a country prophet who saw the corruption in the cities devastating the rural poor. He preached against corrupt leaders, false prophets, and social injustice — and also prophesied with remarkable precision about the Messiah\'s birthplace.',
    themes: ['Social justice — God defends the poor', 'False prophets vs. true prophets', 'The coming ruler from Bethlehem', 'The incomparable God who forgives sin'],
    outline: [
      { section: 'Judgment on Israel and Judah', chapters: '1–3' },
      { section: 'The Future Kingdom — Hope Amid Judgment', chapters: '4–5' },
      { section: 'God\'s Case Against Israel — Call to Repentance', chapters: '6–7' },
    ],
    keyVerses: [
      { ref: 'Micah 5:2', text: 'But you, Bethlehem Ephrathah, though you are small among the clans of Judah, out of you will come for me one who will be ruler over Israel, whose origins are from of old, from ancient times.' },
      { ref: 'Micah 6:8', text: 'He has shown you, O mortal, what is good. And what does the LORD require of you? To act justly and to love mercy and to walk humbly with your God.' },
      { ref: 'Micah 7:18', text: 'Who is a God like you, who pardons sin and forgives the transgression of the remnant of his inheritance?' },
    ],
    christConnection: 'Micah 5:2 is the prophecy the chief priests quoted when Herod asked where the Messiah would be born (Matt 2:4–6). Jesus is born in Bethlehem — small, overlooked, humble — exactly as prophesied 700 years earlier. Micah 6:8 — justice, mercy, humility — describes the life Jesus lived perfectly and calls us to live in Him.',
    application: 'Three things. Just three: justice, mercy, humility. Everything God requires fits in that sentence. Not complex performance. Not elaborate ritual. Walk with God. Love people. Do right.',
  },

  Nahum: {
    author: 'Nahum the Elkoshite', when: '~663–612 BC', audience: 'Judah, after the fall of Assyria approaches',
    bigIdea: 'God is slow to anger but great in power — the same God who showed mercy to Nineveh in Jonah\'s day will now bring final judgment.',
    context: 'Nahum is the sequel to Jonah. About 150 years after Nineveh repented, the city returned to its brutal ways and became the most feared empire on earth. Nahum announces its destruction. In 612 BC — exactly as prophesied — a coalition of Babylonians, Medes, and Scythians destroyed Nineveh so completely that Alexander the Great, two centuries later, marched over its ruins without knowing it had ever existed.',
    themes: ['God\'s justice is certain — no empire escapes', 'God is slow to anger but His wrath is real', 'Good news for the oppressed — the oppressor falls', 'The character of God — jealous, powerful, and good'],
    outline: [
      { section: 'God\'s Character — The Avenger and the Refuge', chapters: '1' },
      { section: 'The Fall of Nineveh Described', chapters: '2' },
      { section: 'The Final Indictment of Nineveh', chapters: '3' },
    ],
    keyVerses: [
      { ref: 'Nahum 1:3', text: 'The LORD is slow to anger but great in power; the LORD will not leave the guilty unpunished.' },
      { ref: 'Nahum 1:7', text: 'The LORD is good, a refuge in times of trouble. He cares for those who trust in him.' },
      { ref: 'Nahum 1:15', text: 'Look, there on the mountains, the feet of one who brings good news, who proclaims peace!' },
    ],
    christConnection: 'Nahum 1:15 is echoed in Isaiah 52:7 — "How beautiful on the mountains are the feet of those who bring good news" — and Paul quotes this in Romans 10:15 about the gospel of Jesus Christ. The "good news" of Nineveh\'s fall was relief for the oppressed. The ultimate good news is Christ\'s victory over sin and death — the oppressor of all humanity finally defeated.',
    application: 'God\'s slowness to anger is not indifference. It is mercy — the same mercy that gave Nineveh a second chance through Jonah. But His patience has limits. The same God who is a refuge for those who trust Him is a consuming fire to those who oppose Him. Trust Him while it is still the day of grace.',
  },

  Habakkuk: {
    author: 'Habakkuk', when: '~609–605 BC', audience: 'Judah on the eve of the Babylonian invasion',
    bigIdea: 'When God\'s answers don\'t make sense, the righteous live by faith — and joy is possible even when everything is stripped away.',
    context: 'Habakkuk is unique: instead of preaching to the people, he argues with God. He cries out about injustice in Judah — why does God allow it? God\'s answer is disturbing: He\'s raising up Babylon to judge Israel. Habakkuk protests again: how can God use something more wicked than Israel? God says: the Babylonians\' day of reckoning is also coming. Wait for it. The book ends with one of the most stunning declarations of faith in the Bible.',
    themes: ['Lament — wrestling with God is faith, not faithlessness', 'The righteous shall live by faith', 'God\'s sovereignty in using unlikely instruments', 'Joy independent of circumstances'],
    outline: [
      { section: 'First Complaint — Why Does God Allow Evil?', chapters: '1:1–4' },
      { section: 'God\'s Answer — Babylon is Coming', chapters: '1:5–11' },
      { section: 'Second Complaint — How Can God Use Babylon?', chapters: '1:12–2:1' },
      { section: 'God\'s Answer — The Righteous Live by Faith', chapters: '2:2–20' },
      { section: 'Habakkuk\'s Prayer of Trust', chapters: '3' },
    ],
    keyVerses: [
      { ref: 'Habakkuk 1:2', text: 'How long, LORD, must I call for help, but you do not listen?' },
      { ref: 'Habakkuk 2:4', text: 'The righteous person will live by his faithfulness.' },
      { ref: 'Habakkuk 2:14', text: 'For the earth will be filled with the knowledge of the glory of the LORD as the waters cover the sea.' },
      { ref: 'Habakkuk 3:17–18', text: 'Though the fig tree does not bud and there are no grapes on the vines... yet I will rejoice in the LORD, I will be joyful in God my Savior.' },
    ],
    christConnection: 'Habakkuk 2:4 — "the righteous shall live by faith" — is the verse that launched the Reformation. Paul quotes it three times (Romans 1:17, Galatians 3:11, Hebrews 10:38) as the foundation of the gospel: righteousness before God is received by faith in Christ, not earned by works. The joy Habakkuk chooses in chapter 3 — stripped of everything, still rejoicing — is the joy Paul describes from prison in Philippians 4.',
    application: 'Habakkuk didn\'t get all his questions answered. He got a better answer: God. When you can\'t trace His hand, trust His character. Joy is not the absence of pain — it\'s the presence of God in the midst of it.',
  },

  Zephaniah: {
    author: 'Zephaniah, great-great-grandson of King Hezekiah', when: '~630–625 BC', audience: 'Judah under King Josiah, before his reforms',
    bigIdea: 'The Day of the LORD brings judgment on all who reject God — but for those who humble themselves, it brings singing and restoration.',
    context: 'Zephaniah prophesied early in Josiah\'s reign, possibly helping ignite the great revival of 621 BC. He opens with a sweeping vision of judgment — God will sweep everything from the face of the earth. He targets specific sins in Jerusalem: religious syncretism, materialism, and complacency. But the book pivots sharply in chapter 3 to one of the most joyful passages in all the prophets — God Himself will sing over His restored people.',
    themes: ['The Day of the LORD — universal judgment', 'Humility as the path to shelter', 'God\'s love for the remnant — the poor and humble', 'God rejoicing over His people with singing'],
    outline: [
      { section: 'Universal Judgment — The Day of the LORD', chapters: '1' },
      { section: 'Call to Repentance — Seek Humility Before the Day', chapters: '2' },
      { section: 'Jerusalem Judged and Restored — God\'s Song', chapters: '3' },
    ],
    keyVerses: [
      { ref: 'Zephaniah 1:14', text: 'The great day of the LORD is near — near and coming quickly.' },
      { ref: 'Zephaniah 2:3', text: 'Seek the LORD, all you humble of the land, you who do what he commands. Seek righteousness, seek humility; perhaps you will be sheltered on the day of the LORD\'s anger.' },
      { ref: 'Zephaniah 3:17', text: 'The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.' },
    ],
    christConnection: 'Zephaniah 3:17 — God singing over His people — finds its fulfillment in the story of the prodigal son (Luke 15): the father who runs, embraces, and throws a party. Jesus is the Mighty Warrior who saves — the one who crushed the enemy at the cross and will return to rescue His people completely. The poor and humble remnant Zephaniah describes are the "poor in spirit" of Jesus\' Beatitudes — theirs is the kingdom.',
    application: 'God is not a disappointed critic watching your life. He is a Father who sings over you. That image in Zephaniah 3:17 is the truest thing about you. Let it reach you.',
  },

  Haggai: {
    author: 'Haggai the prophet', when: '~520 BC', audience: 'Jewish returnees from Babylon who had stalled in rebuilding the Temple',
    bigIdea: 'Putting God\'s house first is not religious duty — it is the path to the flourishing you keep pursuing and not finding.',
    context: 'The exiles returned from Babylon in 538 BC. Work on the Temple began, then stopped. For 16 years, the people focused on their own houses while God\'s house sat in ruins. Haggai delivers four short, dateable messages in a single year (520 BC) calling the people to finish what they started. They listen immediately. The Temple is completed four years later. Haggai is the most immediately effective prophet in the OT.',
    themes: ['Priorities — what comes first shapes everything else', 'Courage in discouraging circumstances', 'God\'s glory will fill this house — greater than before', 'The shaking of all nations'],
    outline: [
      { section: 'First Message — Consider Your Ways', chapters: '1:1–11' },
      { section: 'The People Respond — Work Begins', chapters: '1:12–15' },
      { section: 'Second Message — Be Strong, I Am with You', chapters: '2:1–9' },
      { section: 'Third and Fourth Messages — Blessing and the Signet Ring', chapters: '2:10–23' },
    ],
    keyVerses: [
      { ref: 'Haggai 1:4', text: 'Is it a time for you yourselves to be living in your paneled houses, while this house remains a ruin?' },
      { ref: 'Haggai 1:7', text: 'This is what the LORD Almighty says: "Give careful thought to your ways."' },
      { ref: 'Haggai 2:7–9', text: 'I will shake all nations, and what is desired by all nations will come, and I will fill this house with glory... The glory of this present house will be greater than the glory of the former house.' },
      { ref: 'Haggai 2:23', text: '"I will take you, my servant Zerubbabel son of Shealtiel," declares the LORD, "and I will make you like my signet ring, for I have chosen you."' },
    ],
    christConnection: 'Haggai 2:7 — "the desired of all nations will come" — has been read as a Messianic prophecy of Christ, who enters the very Temple rebuilt by these workers. "The glory of this latter house will be greater than the former" — fulfilled when Jesus, the Glory of God in human form, walked through its courts. Zerubbabel, called God\'s "signet ring," is in Jesus\' genealogy (Matt 1:12).',
    application: '"Consider your ways." That\'s still the invitation. Where have you been working hard and getting less than you hoped? Could it be that something is out of order — that the things of God are last instead of first?',
  },

  Zechariah: {
    author: 'Zechariah, priest and prophet', when: '~520–480 BC', audience: 'Jewish returnees rebuilding Jerusalem and the Temple',
    bigIdea: 'God will restore Jerusalem and send a King who comes riding on a donkey — and one day all nations will worship Him.',
    context: 'Zechariah was a contemporary of Haggai, prophesying during the rebuilding of the Temple. His book is the most Messianic of all the minor prophets — filled with visions and prophecies that are quoted in the NT more than any other OT book outside of Psalms and Isaiah. He encourages a discouraged people: God hasn\'t forgotten them, and the story isn\'t over.',
    themes: ['God\'s commitment to Jerusalem', 'The coming King — humble and triumphant', 'The Good Shepherd and the pierced one', 'The nations coming to worship at the end'],
    outline: [
      { section: 'Eight Night Visions — God\'s Plan for Israel', chapters: '1–6' },
      { section: 'Fasting vs. Justice — True Religion', chapters: '7–8' },
      { section: 'The Coming King and the Final Battle', chapters: '9–14' },
    ],
    keyVerses: [
      { ref: 'Zechariah 4:6', text: '"Not by might nor by power, but by my Spirit," says the LORD Almighty.' },
      { ref: 'Zechariah 9:9', text: 'Rejoice greatly, Daughter Zion! Shout, Daughter Jerusalem! See, your king comes to you, righteous and victorious, lowly and riding on a donkey.' },
      { ref: 'Zechariah 12:10', text: 'They will look on me, the one they have pierced, and they will mourn for him as one mourns for an only child.' },
      { ref: 'Zechariah 13:7', text: '"Awake, sword, against my shepherd, against the man who is close to me!" declares the LORD Almighty. "Strike the shepherd, and the sheep will be scattered."' },
    ],
    christConnection: 'Zechariah is quoted or alluded to more than any minor prophet in the Passion narratives. 9:9 — fulfilled at the triumphal entry (Matt 21:5). 11:12–13 — 30 pieces of silver, the price of betrayal (Matt 26:15, 27:9). 12:10 — "they will look on me, the one they have pierced" — quoted at the crucifixion (John 19:37) and Revelation 1:7. 13:7 — Jesus quotes this at Gethsemane: "Strike the shepherd and the sheep will be scattered" (Matt 26:31). Zechariah is the prophet of the Passion.',
    application: '"Not by might, nor by power, but by my Spirit." The greatest things God has done and will do are not accomplished through human strength. Zerubbabel\'s mountain became a plain before a Spirit-empowered leader. What seems immovable to you is not immovable to Him.',
  },

  Malachi: {
    author: 'Malachi ("my messenger")', when: '~430–420 BC', audience: 'Post-exilic Judah — the last prophetic voice before 400 years of silence',
    bigIdea: 'God\'s love for Israel has never wavered — but their worship has become hollow, their giving robbing God, and their hearts growing cold. Yet the "messenger of the covenant" is coming.',
    context: 'Malachi closes the Old Testament — and then there is silence for 400 years until John the Baptist\'s voice in the wilderness. He addresses a community that has returned from exile, rebuilt the Temple, but slipped into spiritual complacency. The priests are offering defective sacrifices. The people are robbing God in tithes. Marriages are being broken. Yet God still loves them — He just refuses to pretend that half-hearted worship is acceptable.',
    themes: ['God\'s unchanged love for His people', 'The corruption of worship and the priesthood', 'The coming messenger who prepares the way', 'The Day of the LORD and the refiner\'s fire'],
    outline: [
      { section: 'God\'s Love Questioned — His Answer', chapters: '1:1–5' },
      { section: 'The Corrupt Priesthood', chapters: '1:6–2:9' },
      { section: 'Broken Covenants — Marriage and Treachery', chapters: '2:10–16' },
      { section: 'The Coming Messenger and the Refiner', chapters: '2:17–3:5' },
      { section: 'Robbing God — The Tithe', chapters: '3:6–12' },
      { section: 'The Day of the LORD — Elijah\'s Return', chapters: '3:13–4:6' },
    ],
    keyVerses: [
      { ref: 'Malachi 1:2', text: '"I have loved you," says the LORD.' },
      { ref: 'Malachi 3:1', text: '"I will send my messenger, who will prepare the way before me. Then suddenly the Lord you are seeking will come to his temple."' },
      { ref: 'Malachi 3:10', text: '"Bring the whole tithe into the storehouse... Test me in this," says the LORD Almighty, "and see if I will not throw open the floodgates of heaven."' },
      { ref: 'Malachi 4:2', text: 'But for you who revere my name, the sun of righteousness will rise with healing in its rays.' },
      { ref: 'Malachi 4:5–6', text: '"See, I will send the prophet Elijah to you before that great and dreadful day of the LORD comes."' },
    ],
    christConnection: 'Malachi is the bridge between the Testaments. His prophecy of a messenger who prepares the way (3:1) is fulfilled in John the Baptist (Luke 1:76, Matt 11:10). The "Elijah" of 4:5–6 is the last word of the OT — and the first thing the NT explains: "He is the Elijah who was to come" (Matt 11:14), referring to John. The 400 years of silence after Malachi ends with a voice crying in the wilderness. Then Jesus.',
    application: '"I have loved you," says the LORD (1:2). That\'s His opening line — not a rebuke, but a declaration. The call to return is always preceded by this truth. He doesn\'t need you to clean up before He loves you. He loves you. Now come back.',
  },

  Mark: {
    author: 'John Mark, companion of Peter and Paul', when: '~50–65 AD', audience: 'Roman Gentile Christians — possibly written from Rome',
    bigIdea: 'Jesus is the powerful, active Son of God who came not to be served but to serve — and to give His life as a ransom for many.',
    context: 'Mark is the shortest and probably earliest Gospel — written with breathless urgency ("immediately" appears over 40 times). It is believed to largely reflect Peter\'s eyewitness preaching. There is almost no teaching in Mark — it is action, confrontation, exorcism, healing, and ultimately the cross. Mark\'s audience was Roman, familiar with military power, and Mark presents Jesus as the ultimate authority — over demons, disease, nature, and death.',
    themes: ['Jesus as the authoritative Son of God', 'The Messianic secret — Jesus repeatedly tells people not to announce him', 'Discipleship — follow me into suffering', 'The cross — the center of everything'],
    outline: [
      { section: 'The Beginning of the Gospel — Baptism and Temptation', chapters: '1' },
      { section: 'Ministry in Galilee — Authority Displayed', chapters: '1–8' },
      { section: 'The Way of the Cross — Three Predictions', chapters: '8–10' },
      { section: 'The Final Week in Jerusalem', chapters: '11–13' },
      { section: 'Passion and Resurrection', chapters: '14–16' },
    ],
    keyVerses: [
      { ref: 'Mark 1:1', text: 'The beginning of the good news about Jesus the Messiah, the Son of God.' },
      { ref: 'Mark 1:15', text: '"The time has come," he said. "The kingdom of God has come near. Repent and believe the good news!"' },
      { ref: 'Mark 8:34', text: '"Whoever wants to be my disciple must deny themselves and take up their cross and follow me."' },
      { ref: 'Mark 10:45', text: 'For even the Son of Man did not come to be served, but to serve, and to give his life as a ransom for many.' },
    ],
    christConnection: 'Mark 10:45 is the theological center of the entire book — and one of the clearest explanations of the Atonement in the Gospels. Jesus\' life is the ransom. His death buys freedom for those enslaved to sin and death. The centurion\'s declaration at the cross — "Surely this man was the Son of God!" (15:39) — is Mark\'s climactic revelation: the Gentile soldier sees what Israel\'s leaders missed.',
    application: 'Mark moves fast because Jesus moved fast. There is no room for spectators. The call is immediate: repent, believe, follow. Not someday. Now. The kingdom of God has come near.',
  },

  Luke: {
    author: 'Luke, a physician and companion of Paul', when: '~60–62 AD', audience: 'Theophilus (likely a Roman official) and all who need an orderly account of Jesus\' life',
    bigIdea: 'Jesus came to seek and save the lost — the poor, the outcast, the sinner, the Gentile, the woman — everyone the world had written off.',
    context: 'Luke is the longest Gospel and the most beautifully written — a Greek physician composing careful, researched history. He emphasizes Jesus\' ministry to those on the margins: women, tax collectors, Samaritans, lepers, the poor. His Gospel and Acts together form one continuous story: the life of Jesus and the spread of His movement. Luke includes parables found nowhere else — the prodigal son, the good Samaritan, the lost sheep, the Pharisee and tax collector.',
    themes: ['Salvation for all — no one is too lost', 'The Holy Spirit — active from the beginning', 'Prayer — Jesus prays more in Luke than any other Gospel', 'Reversal — the humble exalted, the proud humbled'],
    outline: [
      { section: 'Birth Narratives — John and Jesus', chapters: '1–2' },
      { section: 'Preparation and Beginning of Ministry', chapters: '3–4' },
      { section: 'Galilean Ministry — Teaching and Miracles', chapters: '5–9' },
      { section: 'The Journey to Jerusalem', chapters: '10–19' },
      { section: 'Jerusalem — Teaching, Passion, Resurrection', chapters: '19–24' },
    ],
    keyVerses: [
      { ref: 'Luke 1:37', text: 'For no word from God will ever fail.' },
      { ref: 'Luke 4:18', text: 'The Spirit of the Lord is on me, because he has anointed me to proclaim good news to the poor.' },
      { ref: 'Luke 15:24', text: '"For this son of mine was dead and is alive again; he was lost and is found." So they began to celebrate.' },
      { ref: 'Luke 19:10', text: 'For the Son of Man came to seek and to save the lost.' },
      { ref: 'Luke 23:34', text: 'Jesus said, "Father, forgive them, for they do not know what they are doing."' },
    ],
    christConnection: 'Luke 24 contains the most important Bible study in history — Jesus walking the Emmaus road, beginning with Moses and the Prophets and explaining "what was said in all the Scriptures concerning himself." He is the subject of every book. Luke also emphasizes the resurrection as the foundation of everything: the disciples\' hearts burn within them, then their eyes are opened. Jesus is alive, and everything changes.',
    application: 'The parable of the prodigal son tells you everything you need to know: no matter how far you\'ve gone or how long you\'ve been gone, the Father is still running toward you. You don\'t need to clean up first. Just get up and go home.',
  },

  '1 Corinthians': {
    author: 'Paul the Apostle', when: '~55 AD, written from Ephesus', audience: 'The church at Corinth — a divided, morally compromised, gifted but immature congregation',
    bigIdea: 'The cross of Christ exposes the foolishness of worldly wisdom and is the only foundation on which the church can be built.',
    context: 'Corinth was one of the most cosmopolitan, morally permissive cities in the Roman world. The church reflected its culture: divided into factions, tolerating sexual sin, suing each other in court, getting drunk at the Lord\'s Supper, and fighting over spiritual gifts. Paul writes with pastoral urgency — not to condemn but to call them back to the cross and to love. He includes the most famous chapter on love (ch 13) and the most thorough treatment of the resurrection (ch 15).',
    themes: ['The cross — foolishness to the world, power to the saved', 'Unity in the body of Christ', 'Love — the most excellent way', 'The resurrection — the foundation of Christian hope'],
    outline: [
      { section: 'Divisions and the Wisdom of the Cross', chapters: '1–4' },
      { section: 'Sexual Ethics and Marriage', chapters: '5–7' },
      { section: 'Food Offered to Idols — Freedom and Love', chapters: '8–10' },
      { section: 'Worship Order and the Lord\'s Supper', chapters: '11' },
      { section: 'Spiritual Gifts and the Body of Christ', chapters: '12–14' },
      { section: 'The Resurrection — If Christ Has Not Been Raised...', chapters: '15' },
    ],
    keyVerses: [
      { ref: '1 Corinthians 1:18', text: 'For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God.' },
      { ref: '1 Corinthians 13:4–5', text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking.' },
      { ref: '1 Corinthians 15:3–4', text: 'Christ died for our sins according to the Scriptures... he was buried... he was raised on the third day according to the Scriptures.' },
      { ref: '1 Corinthians 15:55', text: '"Where, O death, is your victory? Where, O death, is your sting?"' },
    ],
    christConnection: '1 Corinthians 15 is the most important chapter on the resurrection ever written. Paul grounds the entire faith here: if Christ has not been raised, our faith is futile (15:17). But He has been raised — and His resurrection is the "first fruits," guaranteeing ours. The love chapter (13) describes Christ perfectly — He is patient, kind, endures all things. His cross is the foolishness of God that is wiser than human wisdom.',
    application: 'The church at Corinth was a mess — and God hadn\'t given up on them. He hasn\'t given up on yours either. Love is not a feeling — it is a series of choices. Start there.',
  },

  '2 Corinthians': {
    author: 'Paul the Apostle', when: '~56 AD', audience: 'The church at Corinth, after a painful rift with Paul',
    bigIdea: 'God\'s power is perfected in weakness — and Paul\'s sufferings prove, rather than disprove, the authenticity of his ministry.',
    context: 'This is Paul\'s most personally vulnerable letter. After 1 Corinthians, a "painful visit" and a "severe letter" had created tension. Some "super-apostles" had arrived in Corinth questioning Paul\'s authority because he was weak, unimpressive in person, and suffered constantly. Paul responds with a theology of weakness and glory — the treasure of the gospel in jars of clay. He shares his thorn in the flesh and defends his ministry through the lens of the cross.',
    themes: ['Strength in weakness — the paradox of Christian ministry', 'Reconciliation — the ministry God gives us', 'Generosity — giving that flows from grace', 'The new creation — new identity in Christ'],
    outline: [
      { section: 'Comfort in Suffering — The God of All Comfort', chapters: '1–2' },
      { section: 'The New Covenant Ministry — Jars of Clay', chapters: '3–5' },
      { section: 'The Ministry of Reconciliation', chapters: '5–7' },
      { section: 'The Collection — Generous Giving', chapters: '8–9' },
      { section: 'Paul Defends His Apostleship — Boasting in Weakness', chapters: '10–13' },
    ],
    keyVerses: [
      { ref: '2 Corinthians 4:7', text: 'But we have this treasure in jars of clay to show that this all-surpassing power is from God and not from us.' },
      { ref: '2 Corinthians 5:17', text: 'Therefore, if anyone is in Christ, the new creation has come: the old has gone, the new is here!' },
      { ref: '2 Corinthians 5:21', text: 'God made him who had no sin to be sin for us, so that in him we might become the righteousness of God.' },
      { ref: '2 Corinthians 12:9', text: '"My grace is sufficient for you, for my power is made perfect in weakness."' },
    ],
    christConnection: '2 Corinthians 5:21 is the most concise statement of substitutionary atonement in the Bible: the great exchange. Christ took our sin; we receive His righteousness. Paul\'s theology of weakness flows directly from the cross — Jesus was crucified in weakness but raised in power (13:4). Every "jar of clay" moment in your life is designed to make the treasure visible.',
    application: 'Your weakness is not a liability to God — it\'s a platform. The thorn Paul begged God to remove was the very thing God used to keep him dependent. "My grace is sufficient." It is. Let it be.',
  },

  Galatians: {
    author: 'Paul the Apostle', when: '~48–55 AD', audience: 'Churches in the region of Galatia, who were being pulled back into law-keeping as a means of salvation',
    bigIdea: 'The gospel of grace — that we are justified by faith in Christ alone, not by works of the Law — must be defended with everything we have.',
    context: 'Galatians is Paul\'s most urgent, impassioned letter. He doesn\'t open with thanksgiving — he opens with shock: "I am astonished that you are so quickly deserting him who called you." False teachers (Judaizers) had convinced the Galatian Christians that faith in Jesus wasn\'t enough — they also needed to be circumcised and follow the Law of Moses. Paul calls this a different gospel — and says anyone preaching it is under a curse (1:8). Then he methodically demolishes the case for legalism.',
    themes: ['Justification by faith alone — not by works', 'Freedom in Christ — don\'t return to slavery', 'Life in the Spirit vs. life in the flesh', 'The fruit of the Spirit'],
    outline: [
      { section: 'Paul\'s Defense of the True Gospel', chapters: '1–2' },
      { section: 'Abraham — Justified by Faith, Not Law', chapters: '3–4' },
      { section: 'Freedom in Christ — Walk in the Spirit', chapters: '5–6' },
    ],
    keyVerses: [
      { ref: 'Galatians 2:16', text: 'A person is not justified by the works of the law, but by faith in Jesus Christ.' },
      { ref: 'Galatians 2:20', text: 'I have been crucified with Christ and I no longer live, but Christ lives in me.' },
      { ref: 'Galatians 3:28', text: 'There is neither Jew nor Gentile, neither slave nor free, nor is there male and female, for you are all one in Christ Jesus.' },
      { ref: 'Galatians 5:22–23', text: 'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.' },
    ],
    christConnection: 'Galatians 2:20 is Paul\'s personal testimony of union with Christ — the most intimate description of what it means to be a Christian. He doesn\'t just follow Jesus from the outside; Christ lives in him. The entire letter is a defense of the cross: if righteousness could be gained through the Law, then Christ died for nothing (2:21). Everything depends on whether the cross accomplished real forgiveness.',
    application: 'You are not on probation with God. You are not earning your standing. You are justified — declared righteous — right now, by faith in Christ alone. The yoke of "try harder" is not from God. It is slavery. For freedom Christ has set you free. Stay free.',
  },

  Philippians: {
    author: 'Paul the Apostle', when: '~60–62 AD, written from prison in Rome', audience: 'The church at Philippi — Paul\'s most beloved congregation',
    bigIdea: 'Joy is not the absence of suffering — it is the presence of Christ, and it is available in every circumstance.',
    context: 'Paul writes from prison, facing possible execution, to a church that has partnered with him faithfully from the beginning. This letter could have been full of complaint — instead it overflows with joy. The word "joy" or "rejoice" appears 16 times in four chapters. Paul has learned the secret of contentment (4:11). He urges them to have the "mind of Christ" — who gave up everything. The most beautiful hymn about the Incarnation (2:6–11) is tucked inside an appeal for humility.',
    themes: ['Joy — independent of circumstances', 'Humility — the mind of Christ', 'Unity in the church', 'Contentment — the peace that passes understanding'],
    outline: [
      { section: 'Thanksgiving and Paul\'s Circumstances', chapters: '1' },
      { section: 'The Mind of Christ — Humility', chapters: '2:1–11' },
      { section: 'Work Out Your Salvation — Shine as Lights', chapters: '2:12–30' },
      { section: 'Warning Against Legalism — Press On', chapters: '3' },
      { section: 'Peace, Contentment, and Final Greetings', chapters: '4' },
    ],
    keyVerses: [
      { ref: 'Philippians 1:21', text: 'For to me, to live is Christ and to die is gain.' },
      { ref: 'Philippians 2:6–8', text: 'Who, being in very nature God, did not consider equality with God something to be used to his own advantage; rather, he made himself nothing... he humbled himself by becoming obedient to death — even death on a cross!' },
      { ref: 'Philippians 4:4', text: 'Rejoice in the Lord always. I will say it again: Rejoice!' },
      { ref: 'Philippians 4:6–7', text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts.' },
      { ref: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.' },
    ],
    christConnection: 'The Christ Hymn (2:6–11) is the most complete description of the Incarnation in the NT outside of John 1. Jesus, fully God, voluntarily emptied Himself — took on flesh, lived as a servant, died on a cross — and was therefore exalted to the highest place. "Every knee shall bow" (2:10) echoes Isaiah 45:23 and applies it to Jesus. Paul\'s entire theology of joy flows from this: if Jesus went through the cross for joy (Heb 12:2), we can endure anything.',
    application: 'Philippians 4:6–7 is the prescription for anxiety. Not "think positive" — present your requests to God with thanksgiving. The peace that follows doesn\'t make sense. It doesn\'t need to. It guards.',
  },

  Colossians: {
    author: 'Paul the Apostle', when: '~60–62 AD, written from prison', audience: 'The church at Colossae, infiltrated by syncretistic false teaching',
    bigIdea: 'Jesus Christ is supreme over all things — every power, every philosophy, every false religion — and everything you need is found in Him.',
    context: 'Colossae was a small city in Asia Minor. False teachers were blending Christianity with Jewish ritual requirements, angel worship, and Gnostic-style mysticism — teaching that Jesus wasn\'t enough. Paul\'s response is one of the most majestic descriptions of Christ\'s supremacy ever written. The Christ Hymn of 1:15–20 declares Him the image of God, creator of all things, sustainer of all things, and reconciler of all things. He is enough. He is more than enough.',
    themes: ['The supremacy of Christ — above every power and philosophy', 'Fullness in Christ — you lack nothing', 'The new life — put off the old, put on the new', 'Warnings against empty philosophy and human tradition'],
    outline: [
      { section: 'The Supremacy of Christ — The Hymn', chapters: '1:15–20' },
      { section: 'Paul\'s Ministry and the Mystery of Christ', chapters: '1–2' },
      { section: 'Warning Against False Teaching', chapters: '2:6–23' },
      { section: 'The New Life — Set Your Minds on Things Above', chapters: '3–4' },
    ],
    keyVerses: [
      { ref: 'Colossians 1:15–16', text: 'The Son is the image of the invisible God, the firstborn over all creation. For in him all things were created: things in heaven and on earth, visible and invisible.' },
      { ref: 'Colossians 1:17', text: 'He is before all things, and in him all things hold together.' },
      { ref: 'Colossians 2:9–10', text: 'For in Christ all the fullness of the Deity lives in bodily form, and in Christ you have been brought to fullness.' },
      { ref: 'Colossians 3:1–2', text: 'Since, then, you have been raised with Christ, set your hearts on things above, where Christ is, seated at the right hand of God.' },
    ],
    christConnection: 'Colossians 1:15–20 is one of the highest Christological passages in the NT. Jesus is the visible image of the invisible God. Everything was created through Him and for Him. He is the one who holds the atom together — "in him all things hold together." He is the firstborn from the dead. He has reconciled all things by the blood of His cross. There is nothing that exists that is not under His authority.',
    application: 'Whatever you\'ve been told you\'re missing, whatever extra thing the world says you need — in Christ you have been brought to fullness (2:10). You are not lacking. You don\'t need an upgrade. You need to see what you already have.',
  },

  '1 Thessalonians': {
    author: 'Paul the Apostle', when: '~50–51 AD — possibly Paul\'s earliest surviving letter', audience: 'The young church at Thessalonica, which Paul planted on his second missionary journey',
    bigIdea: 'Live a holy life, love one another, work hard — and hold your hope in the return of Christ who will raise the dead and bring His people home.',
    context: 'Paul spent only a few weeks in Thessalonica before being driven out by opposition. He is deeply concerned for this young, persecuted church and writes to strengthen them. The letter is warm, personal, and pastoral. A major concern is confusion about what happens to Christians who die before Christ returns. Paul answers with one of the most detailed NT passages on the Second Coming and the resurrection of the dead.',
    themes: ['Holy living — called to sanctification', 'The return of Christ — our living hope', 'Encouragement and pastoral care', 'The resurrection of believers'],
    outline: [
      { section: 'Thanksgiving for Their Faith', chapters: '1' },
      { section: 'Paul\'s Defense of His Ministry', chapters: '2–3' },
      { section: 'Call to Holy Living and Love', chapters: '4:1–12' },
      { section: 'The Return of Christ and the Resurrection', chapters: '4:13–5:11' },
      { section: 'Final Instructions', chapters: '5:12–28' },
    ],
    keyVerses: [
      { ref: '1 Thessalonians 4:13–14', text: 'Brothers and sisters, we do not want you to be uninformed about those who sleep in death, so that you do not grieve like the rest of mankind, who have no hope. For we believe that Jesus died and rose again, and so we believe that God will bring with Jesus those who have fallen asleep in him.' },
      { ref: '1 Thessalonians 4:16–17', text: 'For the Lord himself will come down from heaven, with a loud command, with the voice of the archangel and with the trumpet call of God, and the dead in Christ will rise first.' },
      { ref: '1 Thessalonians 5:16–18', text: 'Rejoice always, pray continually, give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.' },
    ],
    christConnection: 'The return of Christ is not a scare tactic — it is the ultimate pastoral comfort. Paul tells grieving Thessalonians: your dead loved ones are not gone. Jesus\' resurrection guarantees theirs. The One who died and rose again is the same One who will return. Every funeral in the NT is held in the light of Easter morning.',
    application: '1 Thessalonians 5:16–18 — rejoice, pray, give thanks — is not a productivity hack. It is a posture of the heart that says: God is good, God is present, God is working. In all circumstances. Even these.',
  },

  '2 Thessalonians': {
    author: 'Paul the Apostle', when: '~51–52 AD', audience: 'The Thessalonian church, now confused about the Day of the LORD',
    bigIdea: 'The Day of the LORD has not come yet — do not be shaken, do not be idle. Stand firm, work hard, and wait for the return of Christ.',
    context: 'Shortly after 1 Thessalonians, false teaching had circulated — possibly a fake letter in Paul\'s name — claiming the Day of the Lord had already come. Some Christians stopped working and were living in idleness, expecting the end. Paul writes to correct this: certain events must happen first. He encourages the persecuted, rebukes the idle, and calls them to stand firm in the traditions they received.',
    themes: ['Correcting false teaching about the end times', 'Perseverance under persecution', 'The "man of lawlessness" — the coming deception', 'Work — a Christian calling, not optional'],
    outline: [
      { section: 'Thanksgiving and Encouragement for the Persecuted', chapters: '1' },
      { section: 'The Day of the LORD — What Must Happen First', chapters: '2' },
      { section: 'Stand Firm — Instructions on Idleness', chapters: '3' },
    ],
    keyVerses: [
      { ref: '2 Thessalonians 1:7', text: '...and give relief to you who are troubled, and to us as well. This will happen when the Lord Jesus is revealed from heaven in blazing fire with his powerful angels.' },
      { ref: '2 Thessalonians 2:15', text: 'So then, brothers and sisters, stand firm and hold fast to the teachings we passed on to you.' },
      { ref: '2 Thessalonians 3:10', text: 'For even when we were with you, we gave you this rule: "The one who is unwilling to work shall not eat."' },
    ],
    christConnection: 'The man of lawlessness (2:3–4) will exalt himself above God and deceive many — but he is "the lawless one whom the Lord Jesus will overthrow with the breath of his mouth and destroy by the splendor of his coming" (2:8). Christ\'s return is not just rescue — it is decisive judgment. Every counterfeit Christ and every deceptive spirit is already defeated; it just hasn\'t been fully revealed yet.',
    application: 'Uncertainty about the future is not an excuse for inaction in the present. Work faithfully. Stay grounded in the word. Don\'t let fear or speculation or false teaching shake what you know to be true.',
  },

  '1 Timothy': {
    author: 'Paul the Apostle', when: '~62–64 AD', audience: 'Timothy, Paul\'s son in the faith and leader of the church in Ephesus',
    bigIdea: 'The local church is the pillar and foundation of the truth — it must be ordered well, led by qualified people, and marked by godliness.',
    context: 'Paul has left Timothy in Ephesus to deal with false teaching and to establish healthy church order. The letter is personal and pastoral — a father writing to a son who may be young, easily intimidated, and dealing with real opposition. Paul covers qualifications for elders and deacons, proper conduct in worship, care for widows and the poor, and the dangers of the love of money. 1 Timothy is one of the "Pastoral Epistles," alongside 2 Timothy and Titus.',
    themes: ['Sound doctrine — guard what has been entrusted to you', 'Church leadership — qualifications and conduct', 'Godliness — the goal of Christian life', 'The love of money — the root of all kinds of evil'],
    outline: [
      { section: 'Warning Against False Teachers', chapters: '1' },
      { section: 'Instructions on Worship and Church Order', chapters: '2–3' },
      { section: 'False Asceticism and Timothy\'s Charge', chapters: '4' },
      { section: 'Care for Various Groups', chapters: '5' },
      { section: 'Money, Contentment, and Final Charge', chapters: '6' },
    ],
    keyVerses: [
      { ref: '1 Timothy 1:15', text: 'Here is a trustworthy saying that deserves full acceptance: Christ Jesus came into the world to save sinners — of whom I am the worst.' },
      { ref: '1 Timothy 2:5', text: 'For there is one God and one mediator between God and mankind, the man Christ Jesus.' },
      { ref: '1 Timothy 3:16', text: 'Beyond all question, the mystery from which true godliness springs is great: He appeared in the flesh, was vindicated by the Spirit, was seen by angels, was preached among the nations, was believed on in the world, was taken up in glory.' },
      { ref: '1 Timothy 6:6', text: 'But godliness with contentment is great gain.' },
    ],
    christConnection: '1 Timothy 2:5 is one of the most exclusive and most inclusive verses in the Bible: there is ONE mediator. Not many paths. One. But that one mediator — Christ Jesus — is available to ALL people everywhere. This is the gospel: a single bridge between a holy God and sinful humanity, built by One Person, accessible to everyone.',
    application: 'Godliness with contentment is great gain (6:6). Not godliness with success. Not godliness with recognition. Contentment — the settled confidence that God is enough — is itself the profit. Pursue that.',
  },

  '2 Timothy': {
    author: 'Paul the Apostle', when: '~64–67 AD — Paul\'s final letter, written from prison shortly before his execution', audience: 'Timothy, urged to come quickly and continue the work',
    bigIdea: 'Guard the gospel, endure suffering, preach the Word — the time for your life to count is now, because Jesus Christ has abolished death.',
    context: '2 Timothy is Paul\'s last will and testament. He is in a Roman dungeon, awaiting execution. Many have abandoned him. He is cold (asking for his cloak), lonely (asking Timothy to come), and realistic about what\'s coming. Yet the letter radiates confidence — not in his circumstances but in the gospel. Every line breathes urgency: Timothy, do not be ashamed. Do not be timid. Preach the Word. Endure. The work must continue.',
    themes: ['Courage — do not be ashamed of the gospel', 'Suffering — endure as a soldier of Christ', 'The Word of God — breathed by God and sufficient', 'The good fight — Paul\'s finishing well'],
    outline: [
      { section: 'Do Not Be Ashamed — Guard the Deposit', chapters: '1' },
      { section: 'Strong in Grace — Endure Suffering', chapters: '2' },
      { section: 'Last Days Dangers — Continue in the Scriptures', chapters: '3' },
      { section: 'Final Charge — Preach the Word', chapters: '4' },
    ],
    keyVerses: [
      { ref: '2 Timothy 1:7', text: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.' },
      { ref: '2 Timothy 3:16–17', text: 'All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness, so that the servant of God may be thoroughly equipped for every good work.' },
      { ref: '2 Timothy 4:2', text: 'Preach the word; be prepared in season and out of season; correct, rebuke and encourage — with great patience and careful instruction.' },
      { ref: '2 Timothy 4:7–8', text: 'I have fought the good fight, I have finished the race, I have kept the faith. Now there is in store for me the crown of righteousness.' },
    ],
    christConnection: '2 Timothy 2:8 gives Paul\'s one-sentence gospel: "Remember Jesus Christ, raised from the dead, descended from David." Two truths: He is human (David\'s line) and He is risen. The resurrection is the reason Paul can face death without fear. Death has been abolished (1:10). Paul\'s confidence in chapter 4 isn\'t bravado — it flows directly from the fact that the grave is empty.',
    application: '"Fight the good fight, finish the race, keep the faith." That\'s the whole assignment. Not perfect performance — faithful endurance. You don\'t have to win every battle. You just have to not quit.',
  },

  Titus: {
    author: 'Paul the Apostle', when: '~63–65 AD', audience: 'Titus, Paul\'s co-worker left in Crete to establish churches',
    bigIdea: 'Sound doctrine produces godly character — what you believe shapes how you live, and the church must display the grace of God visibly.',
    context: 'Crete had a reputation for being a difficult place — Paul even quotes one of their own poets who called Cretans "always liars, evil brutes, lazy gluttons" (1:12). Titus has been left there to "straighten out what was left unfinished" and appoint elders in every town. Paul writes a concise, practical letter: here\'s what leaders should look like, here\'s how different groups in the church should live, and here\'s the gospel that makes it all possible.',
    themes: ['Good works as the fruit of grace, not the means of salvation', 'Church leadership — character requirements', 'Sound doctrine producing sound lives', 'The grace of God that trains us to say no to ungodliness'],
    outline: [
      { section: 'Qualifications for Elders — Combating False Teachers', chapters: '1' },
      { section: 'Instructions for Various Groups', chapters: '2' },
      { section: 'Living in a Pagan World — The Grace That Saves and Transforms', chapters: '3' },
    ],
    keyVerses: [
      { ref: 'Titus 2:11–12', text: 'For the grace of God has appeared that offers salvation to all people. It teaches us to say "No" to ungodliness and worldly passions, and to live self-controlled, upright and godly lives in this present age.' },
      { ref: 'Titus 2:14', text: 'Who gave himself for us to redeem us from all wickedness and to purify for himself a people that are his very own, eager to do what is good.' },
      { ref: 'Titus 3:5', text: 'He saved us, not because of righteous things we had done, but because of his mercy.' },
    ],
    christConnection: 'Titus 2:13 calls Jesus "our great God and Savior" — one of the clearest declarations of Christ\'s deity in the NT. His appearing (the Incarnation) was grace made visible; His return is glory made visible. The gospel in Titus is simple and complete: God saved us not by our works but by His mercy, through regeneration by the Holy Spirit, so that we might become a people eager to do good.',
    application: 'Grace doesn\'t make us passive — it trains us. The same grace that saves you teaches you to say no. You don\'t resist sin to earn grace. You resist sin because grace has already changed what you want.',
  },

  Philemon: {
    author: 'Paul the Apostle', when: '~60–62 AD, written from prison', audience: 'Philemon, a wealthy Christian slave-owner, and the church in his house',
    bigIdea: 'The gospel transforms relationships — in Christ, the distinctions that divide humanity lose their ultimate power, and we are called to treat one another as beloved brothers.',
    context: 'Philemon is the most personal of Paul\'s letters — 25 verses addressing a specific situation. Onesimus, Philemon\'s runaway slave, had somehow encountered Paul in prison and become a Christian. Paul is sending him back to his master — but with this letter appealing to Philemon to receive him "no longer as a slave, but better than a slave, as a dear brother." Paul makes the appeal on the basis of love, not command.',
    themes: ['The gospel transforms social relationships', 'Forgiveness and reconciliation — not just positional but practical', 'Paul\'s pastoral tact and love', 'Christian brotherhood transcends social status'],
    outline: [
      { section: 'Greeting and Thanksgiving', chapters: '1–7' },
      { section: 'The Appeal for Onesimus', chapters: '8–21' },
      { section: 'Final Greetings', chapters: '22–25' },
    ],
    keyVerses: [
      { ref: 'Philemon 10–11', text: 'I appeal to you for my son Onesimus, who became my son while I was in chains. Formerly he was useless to you, but now he has become useful both to you and to me.' },
      { ref: 'Philemon 15–16', text: 'Perhaps the reason he was separated from you for a little while was that you might have him back forever — no longer as a slave, but better than a slave, as a dear brother.' },
      { ref: 'Philemon 18', text: 'If he has done you any wrong or owes you anything, charge it to me.' },
    ],
    christConnection: 'Philemon 18 — "charge it to me" — is one of the most direct pictures of substitutionary atonement in Scripture. Paul stands between Onesimus and his debt, offering to pay it himself. This is exactly what Jesus does for us: He steps between us and the debt we owe God and says "charge it to me." Onesimus means "useful" — a man whose name was ironic until grace made it true. That\'s the gospel.',
    application: 'Is there someone in your life who has wronged you, who deserves nothing from you, whom you could receive "as a dear brother" because of what Christ has done? The gospel always moves toward reconciliation.',
  },

  Hebrews: {
    author: 'Unknown — candidates include Paul, Apollos, Barnabas, or Priscilla', when: '~60–70 AD', audience: 'Jewish Christians tempted to abandon Christ and return to Judaism',
    bigIdea: 'Jesus is greater than everything that came before — greater than angels, Moses, the priesthood, the sacrifices — and He is the final, perfect Word of God.',
    context: 'Hebrew Christians were facing severe persecution and were tempted to return to the safety of Judaism. The author writes a sustained theological argument: don\'t go back. Jesus is not just a step forward from Moses — He is the final destination that everything Moses pointed to. He is the better High Priest, the better sacrifice, and the mediator of a better covenant. The book also contains some of the most urgent warnings in the NT about the danger of apostasy.',
    themes: ['The supremacy of Jesus over all previous revelation', 'The fulfillment of the entire OT sacrificial system', 'Faith — the hall of heroes (Hebrews 11)', 'Perseverance — don\'t drift, don\'t shrink back'],
    outline: [
      { section: 'Jesus Greater Than Angels and Moses', chapters: '1–4' },
      { section: 'Jesus the Great High Priest', chapters: '4–7' },
      { section: 'The Better Covenant, Sanctuary, and Sacrifice', chapters: '8–10' },
      { section: 'Faith — The Hall of Heroes', chapters: '11' },
      { section: 'Run the Race — Fix Your Eyes on Jesus', chapters: '12–13' },
    ],
    keyVerses: [
      { ref: 'Hebrews 1:1–2', text: 'In the past God spoke to our ancestors through the prophets at many times and in various ways, but in these last days he has spoken to us by his Son.' },
      { ref: 'Hebrews 4:15–16', text: 'For we do not have a high priest who is unable to empathize with our weaknesses... Let us then approach God\'s throne of grace with confidence.' },
      { ref: 'Hebrews 11:1', text: 'Now faith is confidence in what we hope for and assurance about what we do not see.' },
      { ref: 'Hebrews 12:1–2', text: 'Let us run with perseverance the race marked out for us, fixing our eyes on Jesus, the pioneer and perfecter of faith.' },
    ],
    christConnection: 'Hebrews is the NT\'s most thorough exposition of the OT sacrificial system — and how Jesus fulfills every single detail. He is both the priest and the sacrifice. He entered not an earthly sanctuary but heaven itself, with His own blood, securing eternal redemption. The Day of Atonement that happened every year for centuries was a rehearsal. Jesus\' death was the performance it was always pointing to — "once for all."',
    application: 'You have a High Priest who has been there — in weakness, in temptation, in suffering. He is not distant from your struggle. Approach His throne of grace with confidence. You will find mercy and grace in your time of need.',
  },

  James: {
    author: 'James, the brother of Jesus and leader of the Jerusalem church', when: '~45–50 AD — possibly the earliest NT letter', audience: 'Jewish Christians scattered throughout the Roman Empire',
    bigIdea: 'Faith that does not produce works is dead — genuine Christianity shows itself in how you treat the poor, control your tongue, and respond to trials.',
    context: 'James is the most practical book in the NT — it reads like Proverbs dressed in gospel clothes. James leads the Jerusalem church and writes to scattered Jewish believers facing poverty, discrimination, and trials. He has little patience for cheap grace that doesn\'t produce changed behavior. His letter has been misread as opposing Paul\'s theology of faith — but they are answering different questions. Paul asks "how are you justified?" (faith alone). James asks "what does justified faith look like?" (it produces works).',
    themes: ['Trials as the school of perseverance', 'The tongue — the fire no one can tame', 'True religion — caring for the poor', 'Faith without works is dead'],
    outline: [
      { section: 'Trials and Temptations — Wisdom and Endurance', chapters: '1' },
      { section: 'Favoritism — The Sin of Partiality', chapters: '2:1–13' },
      { section: 'Faith and Works — Show Me Your Faith', chapters: '2:14–26' },
      { section: 'The Tongue — The Small Fire', chapters: '3' },
      { section: 'Worldliness, Pride, and the Coming Lord', chapters: '4–5' },
    ],
    keyVerses: [
      { ref: 'James 1:2–3', text: 'Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance.' },
      { ref: 'James 1:22', text: 'Do not merely listen to the word, and so deceive yourselves. Do what it says.' },
      { ref: 'James 2:17', text: 'In the same way, faith by itself, if it is not accompanied by action, is dead.' },
      { ref: 'James 4:8', text: 'Come near to God and he will come near to you.' },
    ],
    christConnection: 'James 2:8 calls love of neighbor "the royal law" — the law of the King. Every demand James makes is the life Jesus lived: caring for the poor, controlling the tongue, resisting pride, praying for the sick. James is not salvation by works — it is the fruit of salvation made visible. "Show me your faith without deeds and I will show you my faith by my deeds" (2:18).',
    application: 'The trial you\'re in is not random. It is producing something in you that comfort never could. Perseverance is not the absence of pain — it is the decision to keep going through it. Let it finish its work.',
  },

  '1 Peter': {
    author: 'Peter the Apostle', when: '~60–64 AD, written from Rome ("Babylon")', audience: 'Christians scattered across Asia Minor, facing suffering and marginalization',
    bigIdea: 'You are a chosen people, a royal priesthood, a holy nation — live accordingly, even in suffering, following the example of Christ who suffered and was glorified.',
    context: 'Peter writes to Christians experiencing social hostility and beginning persecution under Nero. They are "strangers and exiles" — their citizenship is elsewhere. He calls them to holy living not to earn standing but because they already have it in Christ. The letter is saturated with the theology of Christ\'s suffering as both the foundation of their salvation and the model for their own response to suffering.',
    themes: ['Identity — chosen, royal, holy, God\'s own people', 'Suffering — the path Christ took, and the path we share', 'Holy living as witness in a hostile world', 'Hope — an inheritance kept in heaven'],
    outline: [
      { section: 'Identity and Hope — The Living Stone', chapters: '1–2' },
      { section: 'Living as Aliens — Conduct Among the Nations', chapters: '2–3' },
      { section: 'Suffering as Christ Suffered', chapters: '3–4' },
      { section: 'Elders and the Coming Glory', chapters: '5' },
    ],
    keyVerses: [
      { ref: '1 Peter 1:3–4', text: 'Praise be to the God and Father of our Lord Jesus Christ! In his great mercy he has given us new birth into a living hope through the resurrection of Jesus Christ from the dead, and into an inheritance that can never perish, spoil or fade.' },
      { ref: '1 Peter 2:9', text: 'But you are a chosen people, a royal priesthood, a holy nation, God\'s special possession, that you may declare the praises of him who called you out of darkness into his wonderful light.' },
      { ref: '1 Peter 2:24', text: '"He himself bore our sins" in his body on the cross, so that we might die to sins and live for righteousness; "by his wounds you have been healed."' },
      { ref: '1 Peter 5:7', text: 'Cast all your anxiety on him because he cares for you.' },
    ],
    christConnection: '1 Peter 2:24 quotes Isaiah 53 and applies it directly to Jesus: He bore our sins, by His wounds we are healed. The suffering servant Isaiah described 700 years earlier is identified as Jesus of Nazareth. Peter — who denied Jesus three times — writes with the authority of someone who has experienced the depths of Jesus\' grace. His restoration is the proof that the cross goes that far.',
    application: 'You are not defined by the culture that marginalizes you. You are chosen, royal, holy, and beloved. Live from that identity. And cast your anxiety on Him — not because you\'re strong enough to carry it alone, but because He specifically cares for you.',
  },

  '2 Peter': {
    author: 'Peter the Apostle', when: '~64–68 AD — Peter\'s final letter before his martyrdom', audience: 'Christians threatened by false teaching within the church',
    bigIdea: 'Grow in the grace and knowledge of Christ — and beware of false teachers who twist Scripture and lead people into destruction.',
    context: 'Peter knows he will die soon (1:14). He writes urgently to warn believers about false teachers who will come from within the church — twisting the gospel for financial gain, denying the return of Christ, and living in immorality. The letter is Peter\'s final charge: be diligent, remember the prophetic word, and know that the Day of the Lord is coming — God\'s patience is not slowness.',
    themes: ['Growth in godliness — add virtue to virtue', 'False teachers — their destruction is certain', 'Scripture — no prophecy is of private interpretation', 'The Day of the Lord — certain and coming'],
    outline: [
      { section: 'Diligence in Godly Growth', chapters: '1' },
      { section: 'Warning Against False Teachers', chapters: '2' },
      { section: 'The Day of the Lord — God\'s Patience and Certainty', chapters: '3' },
    ],
    keyVerses: [
      { ref: '2 Peter 1:3', text: 'His divine power has given us everything we need for a godly life through our knowledge of him who called us by his own glory and goodness.' },
      { ref: '2 Peter 1:20–21', text: 'Above all, you must understand that no prophecy of Scripture came about by the prophet\'s own interpretation of things. For prophecy never had its origin in the human will, but prophets, though human, spoke from God as they were carried along by the Holy Spirit.' },
      { ref: '2 Peter 3:9', text: 'The Lord is not slow in keeping his promise, as some understand slowness. Instead he is patient with you, not wanting anyone to perish, but everyone to come to repentance.' },
      { ref: '2 Peter 3:18', text: 'But grow in the grace and knowledge of our Lord and Savior Jesus Christ.' },
    ],
    christConnection: 'Peter closes with what he calls the whole point: grow in the grace and knowledge of Jesus Christ. Everything in 2 Peter — the call to godliness, the warning against false teaching, the theology of Scripture, the certainty of judgment — serves one purpose: knowing Christ more fully. The Transfiguration Peter witnessed (1:16–18) is his anchor: "We were eyewitnesses of his majesty."',
    application: 'God\'s patience in delaying judgment is not indifference — it is mercy toward people who haven\'t come to Him yet. Be grateful for it. And use the time to grow — not to coast.',
  },

  '1 John': {
    author: 'John the Apostle', when: '~85–95 AD', audience: 'Churches in Asia Minor, likely Ephesus, dealing with early Gnostic teaching',
    bigIdea: 'God is light, God is love, God is life — and those who truly know Him will walk in light, love their brothers, and keep His commands.',
    context: 'False teachers had left the community (2:19), denying that Jesus came in the flesh and claiming to be without sin. John writes to reassure true believers of their standing and to provide tests of genuine faith: do you walk in light, do you love your brothers, do you believe that Jesus is the Christ come in the flesh? The letter is circular and meditative — returning to the same themes of light, love, and life.',
    themes: ['Assurance of salvation — know that you know', 'Walking in light — no fellowship with darkness', 'Love — the defining mark of God\'s children', 'Jesus Christ come in the flesh — the test of every spirit'],
    outline: [
      { section: 'God Is Light — Walk in the Light', chapters: '1:1–2:11' },
      { section: 'Do Not Love the World', chapters: '2:12–17' },
      { section: 'The Antichrists — Test Every Spirit', chapters: '2:18–3:10' },
      { section: 'Love One Another — God Is Love', chapters: '3:11–4:21' },
      { section: 'Faith That Overcomes — The Testimony of God', chapters: '5' },
    ],
    keyVerses: [
      { ref: '1 John 1:9', text: 'If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness.' },
      { ref: '1 John 3:1', text: 'See what great love the Father has lavished on us, that we should be called children of God! And that is what we are!' },
      { ref: '1 John 4:8', text: 'Whoever does not love does not know God, because God is love.' },
      { ref: '1 John 5:13', text: 'I write these things to you who believe in the name of the Son of God so that you may know that you have eternal life.' },
    ],
    christConnection: '1 John opens like John\'s Gospel: "In the beginning was the Word" becomes "That which was from the beginning... the Word of life... we have seen with our own eyes." John is an eyewitness. He touched Jesus. The Incarnation is not a metaphor — the eternal God became physical flesh, and that fact is non-negotiable. This is why he says if a spirit denies it, it is not from God (4:2–3).',
    application: '1 John 5:13 was written so you can know. Not hope. Not suspect. Know. Assurance is not arrogance — it is receiving God\'s own testimony about His Son. If you believe in Jesus, you have eternal life. Rest in that.',
  },

  '2 John': {
    author: 'John the Apostle ("the elder")', when: '~85–95 AD', audience: '"The chosen lady and her children" — likely a local church',
    bigIdea: 'Love one another and walk in truth — and do not welcome false teachers who deny the Incarnation, lest you become a partner in their error.',
    context: '2 John is a short letter — 13 verses — from "the elder" to a house church. John rejoices that some of her "children" are walking in truth. He exhorts them to love one another (which he calls not a new command but the oldest one) and warns them: if anyone comes to you denying that Jesus Christ came in the flesh, do not welcome them into your home or even greet them — because doing so makes you a partner in their destructive work.',
    themes: ['Walking in truth and love together', 'Discernment — not all who claim to be Christian are', 'The danger of false hospitality', 'Abiding in the teaching of Christ'],
    outline: [
      { section: 'Greeting and Joy Over Truth', chapters: '1–4' },
      { section: 'The Commandment — Love One Another', chapters: '5–6' },
      { section: 'Warning Against Deceivers', chapters: '7–11' },
      { section: 'Closing', chapters: '12–13' },
    ],
    keyVerses: [
      { ref: '2 John 6', text: 'And this is love: that we walk in obedience to his commands. As you have heard from the beginning, his command is that you walk in love.' },
      { ref: '2 John 9', text: 'Anyone who runs ahead and does not continue in the teaching of Christ does not have God; whoever continues in the teaching has both the Father and the Son.' },
    ],
    christConnection: 'John\'s test for every spirit and every teacher is the Incarnation: does this person acknowledge that Jesus Christ came in the flesh? This is the irreducible core of Christianity. Jesus is not a spirit, not a metaphor, not a teacher of ideas. He is God in actual human flesh. Everything the gospel offers — substitution, resurrection, mediation — requires a real physical person. That person is Jesus.',
    application: 'Love and truth are not opposites — they require each other. You cannot truly love someone while affirming what will destroy them. Walk in truth. Walk in love. When these seem in tension, the answer is usually more prayer, not less discernment.',
  },

  '3 John': {
    author: 'John the Apostle ("the elder")', when: '~85–95 AD', audience: 'Gaius, a faithful member of a local church',
    bigIdea: 'Walk faithfully in the truth, support those who work for the gospel, and do not imitate evil — even when leaders misuse their authority.',
    context: '3 John is the shortest book in the NT — 14 verses, a personal letter. Gaius is commended for his hospitality to traveling missionaries. Diotrephes is rebuked — he loves the preeminence, refuses to welcome the missionaries, and even throws out church members who try to help them. Demetrius is commended. John promises to address Diotrephes personally when he comes.',
    themes: ['Hospitality — supporting those who work for the gospel', 'Humble leadership vs. power-hungry leadership', 'Walking in truth as the greatest joy', 'Imitate good, not evil'],
    outline: [
      { section: 'Commendation of Gaius', chapters: '1–8' },
      { section: 'Rebuke of Diotrephes', chapters: '9–10' },
      { section: 'Commendation of Demetrius', chapters: '11–12' },
      { section: 'Closing', chapters: '13–14' },
    ],
    keyVerses: [
      { ref: '3 John 4', text: 'I have no greater joy than to hear that my children are walking in the truth.' },
      { ref: '3 John 11', text: 'Dear friend, do not imitate what is evil but what is good. Anyone who does what is good is from God.' },
    ],
    christConnection: 'Diotrephes, who loves to be first, is the anti-Christ character in this letter — in the sense that he embodies the exact opposite of Jesus, who took the towel and basin. Jesus said "whoever wants to be first must be slave of all" (Mark 10:44). Every power-hungry leader in church history is an echo of Diotrephes. The true shepherd lays down his life; he doesn\'t protect his position.',
    application: 'John\'s greatest joy was hearing that his people were walking in truth. That\'s the goal. Not impressive programs, not large numbers, not influence — faithful people walking with God. Be one.',
  },

  Jude: {
    author: 'Jude, brother of James and half-brother of Jesus', when: '~65–80 AD', audience: 'Christians facing false teachers who had infiltrated the church',
    bigIdea: 'Contend earnestly for the faith once for all delivered to the saints — ungodly people have crept in, but God will keep His people and judge the wicked.',
    context: 'Jude intended to write about salvation but changed course urgently: false teachers have crept in secretly — people who turn grace into license and deny Jesus as Lord. He calls believers to contend for the faith, remember the warnings of the apostles, show mercy to the wavering, and trust God to keep them. He quotes from 1 Enoch and the Testament of Moses — showing familiarity with Jewish apocryphal tradition.',
    themes: ['Contending for the faith — not optional', 'False teachers — their judgment is certain', 'God\'s faithfulness to keep His own', 'Mercy to the doubtful — rescue those being pulled away'],
    outline: [
      { section: 'Greeting and Purpose — Defend the Faith', chapters: '1–4' },
      { section: 'Examples of Judgment — Angels, Sodom, Cain', chapters: '5–16' },
      { section: 'Remember the Apostolic Warnings — Build Yourself Up', chapters: '17–23' },
      { section: 'The Doxology — God Who Keeps', chapters: '24–25' },
    ],
    keyVerses: [
      { ref: 'Jude 3', text: 'I felt compelled to write and urge you to contend for the faith that was once for all entrusted to God\'s holy people.' },
      { ref: 'Jude 20–21', text: 'But you, dear friends, by building yourselves up in your most holy faith and praying in the Holy Spirit, keep yourselves in God\'s love as you wait for the mercy of our Lord Jesus Christ to bring you to eternal life.' },
      { ref: 'Jude 24–25', text: 'To him who is able to keep you from stumbling and to present you before his glorious presence without fault and with great joy — to the only God our Savior be glory, majesty, power and authority, through Jesus Christ our Lord.' },
    ],
    christConnection: 'Jude\'s closing doxology (vv. 24–25) is one of the most beautiful passages in the NT: God is able to keep you from stumbling and to present you without fault before His presence with joy. This is what Jesus does. He is both our advocate and our righteousness. We don\'t present ourselves — He presents us. The One who kept the disciples through all their failures and failures is still keeping His people today.',
    application: 'Contend for the faith — not angrily, not combatively, but earnestly. The gospel is worth defending. And while you contend externally, build yourself up internally: pray in the Spirit, stay in His love, keep your eyes on the coming mercy. Both matter.',
  },
};

interface CrossRef {
  ref: string;
  quote: string;
  connection: string;
}

interface Props {
  selectedBook: BookDef;
  selectedChapter: number;
  setSelectedBook: (b: BookDef) => void;
  setSelectedChapter: (c: number) => void;
  bibles: ApiBible[];
  biblesLoading: boolean;
  selectedBible: ApiBible | null;
  setSelectedBible: (b: ApiBible) => void;
  passage: Passage | null;
  loading: boolean;
  error: string;
  compareMode: boolean;
  setCompareMode: (v: boolean) => void;
  compareSet: ApiBible[];
  setCompareSet: (v: ApiBible[] | ((prev: ApiBible[]) => ApiBible[])) => void;
  comparePassages: Record<string, Passage>;
  compareLoading: boolean;
  highlighted: Set<string>;
  toggleHighlight: (vKey: string) => void;
  notes: Record<string, string>;
  saveNote: (key: string, text: string) => void;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  accentColor: string;
  themeGroup?: 'black' | 'white' | 'dark';
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsRate: number;
  ttsMode?: 'narrator' | 'crafted';
  experienceLevel?: 'beginner' | 'intermediate' | 'expert';
  jumpToVerse?: number;
  onJumpHandled?: () => void;
  onShareNote?: (noteText: string, bookName: string, chapter: number) => void;
}

export default function ReadTab({
  selectedBook, selectedChapter, setSelectedBook, setSelectedChapter,
  bibles, biblesLoading, selectedBible, setSelectedBible,
  passage, loading, error,
  compareMode, setCompareMode, compareSet, setCompareSet, comparePassages, compareLoading,
  highlighted, toggleHighlight, notes, saveNote,
  fontSize, accentColor, themeGroup = 'dark', ttsEnabled, ttsVoice, ttsRate, ttsMode,
  experienceLevel = 'beginner', jumpToVerse, onJumpHandled, onShareNote,
}: Props) {
  const [deepStudyOpen, setDeepStudyOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [showBookList, setShowBookList] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [translationSearch, setTranslationSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('eng');
  const [showNotes, setShowNotes] = useState(false);
  const [note, setNote] = useState(notes[`${selectedBook.name} ${selectedChapter}`] || '');

  // TTS state
  const [speaking, setSpeaking] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const ttsAbortRef = useRef<AbortController | null>(null);
  // AudioContext approach: resume() during the user gesture keeps the context
  // trusted indefinitely — unlike HTMLAudioElement whose gesture token expires
  // before ElevenLabs (2-5 s) returns.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  // Fallback for browsers without AudioContext
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const unlockAudio = useCallback(() => {
    // Already unlocked
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') return;
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx: AudioContext = new AC();
      // resume() MUST be called synchronously inside the user gesture
      ctx.resume().catch(() => {});
      audioCtxRef.current = ctx;
    } catch {}
  }, []);

  // Long-press state
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressingVerse, setPressingVerse] = useState<number | null>(null); // for visual feedback

  const stopTTS = useCallback(() => {
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    setTtsLoading(false);
    // Stop AudioContext source (primary path)
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch {}
      audioSourceRef.current = null;
    }
    // Stop HTMLAudioElement (fallback path)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const playTTS = useCallback((fromVerse?: number) => {
    if (!passage) return;

    // MUST be synchronous inside the user gesture — unlocks AudioContext for the session
    unlockAudio();

    // Stop whatever is currently playing
    stopTTS();

    const allVerses = fromVerse
      ? passage.verses.filter(v => v.verse >= fromVerse)
      : passage.verses;

    const verses: { verse: number; text: string }[] = [];
    let totalChars = 0;
    for (const v of allVerses) {
      if (totalChars + v.text.length > 2000) break;
      verses.push({ verse: v.verse, text: v.text });
      totalChars += v.text.length;
    }
    if (verses.length === 0) return;

    const narratorVoiceId = ttsVoice ? ttsVoice.replace('eleven:', '') : '88cgASIFJ5iO94COdgBO';

    const abort = new AbortController();
    ttsAbortRef.current = abort;
    setTtsLoading(true);

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verses, narratorVoiceId, bookIndex: BOOKS.indexOf(selectedBook), chapter: selectedChapter, mode: ttsMode || 'narrator' }),
      signal: abort.signal,
    })
      .then(r => { if (!r.ok) throw new Error('TTS failed'); return r.arrayBuffer(); })
      .then(async (arrayBuffer) => {
        ttsAbortRef.current = null;
        setTtsLoading(false);
        if (arrayBuffer.byteLength < 100) return;

        const ctx = audioCtxRef.current;

        if (ctx && ctx.state !== 'closed') {
          // ── AudioContext path (iOS-safe) ────────────────────────────────────
          // Ensure context is running (it may have auto-suspended)
          if (ctx.state === 'suspended') await ctx.resume();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = ttsRate || 1;
          source.connect(ctx.destination);
          source.onended = () => { setSpeaking(false); audioSourceRef.current = null; };
          audioSourceRef.current = source;
          setSpeaking(true);
          source.start(0);
        } else {
          // ── HTMLAudioElement fallback (desktop / non-WebKit) ───────────────
          const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.playbackRate = ttsRate || 1;
          audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
          audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
          audioRef.current = audio;
          setSpeaking(true);
          audio.play().catch(() => { setSpeaking(false); audioRef.current = null; });
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setTtsLoading(false);
        setSpeaking(false);
      });
  }, [passage, ttsVoice, ttsRate, ttsMode, selectedBook, selectedChapter, unlockAudio, stopTTS]);

  const toggleTTS = useCallback(() => {
    if (!passage) return;
    if (speaking) { stopTTS(); return; }
    playTTS();
  }, [passage, speaking, stopTTS, playTTS]);

  // Stop TTS on chapter change
  useEffect(() => {
    stopTTS();
  }, [selectedBook, selectedChapter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop TTS on unmount (when leaving the tab)
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // AI verse panel state
  const [activeVerse, setActiveVerse] = useState<ParsedVerse | null>(null);
  const [aiMode, setAiMode] = useState<'explain' | 'crossref' | 'ask' | null>(null);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([]);
  const [crossRefLoading, setCrossRefLoading] = useState(false);
  const [askInput, setAskInput] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Chapter deep study state
  const [chapterStudyOpen, setChapterStudyOpen] = useState(false);
  const [chapterStudy, setChapterStudy] = useState('');
  const [chapterStudying, setChapterStudying] = useState(false);

  // Multi-verse selection state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [multiVerseStudyOpen, setMultiVerseStudyOpen] = useState(false);
  const [multiVerseResult, setMultiVerseResult] = useState('');
  const [multiVerseLoading, setMultiVerseLoading] = useState(false);

  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<{ question: string; options: string[]; correct: number; explanation: string }[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const startQuiz = useCallback(async () => {
    if (!passage || !selectedBible) return;
    setShowQuiz(true);
    setQuizLoading(true);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizSelected(null);
    setQuizScore(0);
    setQuizFinished(false);
    try {
      const verseTexts = passage.verses.map(v => ({ verse: v.verse, text: v.text }));
      const res = await fetch('/api/altar/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: selectedBook.name, chapter: selectedChapter, verseTexts, translation: selectedBible.abbreviationLocal }),
      });
      const data = await res.json();
      setQuizQuestions(Array.isArray(data) ? data : []);
    } catch {
      setQuizQuestions([]);
    } finally {
      setQuizLoading(false);
    }
  }, [passage, selectedBible, selectedBook, selectedChapter]);

  const handleQuizAnswer = (optIndex: number) => {
    if (quizSelected !== null) return;
    setQuizSelected(optIndex);
    if (optIndex === quizQuestions[quizIndex]?.correct) {
      setQuizScore(s => s + 1);
    }
  };

  const handleQuizNext = () => {
    if (quizIndex + 1 >= quizQuestions.length) {
      setQuizFinished(true);
    } else {
      setQuizIndex(i => i + 1);
      setQuizSelected(null);
    }
  };

  const noteKey = `${selectedBook.name} ${selectedChapter}`;
  const isOT = BOOKS.indexOf(selectedBook) < 39;
  const fsClass = { sm: 'text-base', base: 'text-lg', lg: 'text-xl', xl: 'text-2xl' }[fontSize];
  const { gold, goldFaint, goldBorder, cream, dark } = T;

  // ── Adaptive palette — all text / bg colours adjust for white vs dark themes ──
  const isLight = themeGroup === 'white';
  const tx1  = isLight ? '#0f172a'                   : '#f0f8f4';          // primary text
  const tx2  = isLight ? 'rgba(15,23,42,0.65)'       : 'rgba(232,240,236,0.65)'; // secondary text
  const tx3  = isLight ? 'rgba(15,23,42,0.38)'       : 'rgba(232,240,236,0.35)'; // tertiary / hint text
  const txVerse = isLight ? '#1e293b'                : cream;              // scripture body text
  const dropBg  = isLight ? '#ffffff'                : '#0d1710';          // dropdown/panel bg
  const dropBorder = isLight ? `rgba(0,0,0,0.10)`   : `${accentColor}20`; // dropdown border
  const dropShadow = isLight
    ? '0 16px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'
    : '0 24px 80px rgba(0,0,0,0.85)';
  const cardBg     = isLight ? 'rgba(0,0,0,0.03)'   : 'rgba(255,255,255,0.025)';
  const inputBg    = isLight ? 'rgba(0,0,0,0.04)'   : `${accentColor}0a`;
  const inputBorder = isLight ? 'rgba(0,0,0,0.12)'  : `${accentColor}18`;
  const divider    = isLight ? 'rgba(0,0,0,0.07)'   : `${accentColor}10`;

  const pillActive = { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 0 12px ${accentColor}66` };
  const pillInactive = { background: goldFaint, color: 'rgba(212,168,83,0.55)', border: `1px solid ${goldBorder}` };

  // Only show language tabs that have at least one Bible available
  const availableLanguages = SUPPORTED_LANGUAGES.filter(lang =>
    bibles.some(b => (b.languageId || 'eng') === lang.id)
  );

  const langBibles = bibles.filter(b => (b.languageId || 'eng') === languageFilter);
  const popularBibles = langBibles.filter(b => b.group === 'popular');
  const otherBibles = langBibles.filter(b => b.group === 'other');
  const filteredOther = otherBibles.filter(b =>
    !translationSearch ||
    b.name.toLowerCase().includes(translationSearch.toLowerCase()) ||
    b.abbreviationLocal.toLowerCase().includes(translationSearch.toLowerCase())
  );

  // Clear active verse on chapter change + mark scripture read
  useEffect(() => {
    completeDailyCheck('scripture');
    setActiveVerse(null);
    setAiMode(null);
    setExplanation('');
    setCrossRefs([]);
    setAskAnswer('');
    setMultiSelectMode(false);
    setSelectedVerses(new Set());
    setNote(notes[`${selectedBook.name} ${selectedChapter}`] || '');
    setChapterStudyOpen(false);
    setChapterStudy('');
    setMultiVerseStudyOpen(false);
    setMultiVerseResult('');
  }, [selectedBook, selectedChapter]);

  // Jump to verse from search
  useEffect(() => {
    if (!jumpToVerse || !passage || loading) return;
    const target = passage.verses.find(v => v.verse === jumpToVerse);
    if (target) {
      setActiveVerse(target);
      setAiMode(null);
      setTimeout(() => scrollToVerse(jumpToVerse), 500);
    }
    onJumpHandled?.();
  }, [jumpToVerse, passage, loading]);

  // Panel scroll is handled manually by quick action bar buttons only

  const navigate = (dir: 'prev' | 'next') => {
    const idx = BOOKS.findIndex(b => b.osis === selectedBook.osis);
    if (dir === 'prev') {
      if (selectedChapter > 1) setSelectedChapter(selectedChapter - 1);
      else if (idx > 0) { setSelectedBook(BOOKS[idx - 1]); setSelectedChapter(BOOKS[idx - 1].chapters); }
    } else {
      if (selectedChapter < selectedBook.chapters) setSelectedChapter(selectedChapter + 1);
      else if (idx < BOOKS.length - 1) { setSelectedBook(BOOKS[idx + 1]); setSelectedChapter(1); }
    }
  };

  const startLongPress = useCallback((v: ParsedVerse) => {
    setPressingVerse(v.verse);
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null; // mark as fired so onTouchEnd skips tap
      setMultiSelectMode(true);
      setSelectedVerses(new Set([v.verse]));
      setActiveVerse(null);
      setAiMode(null);
      setPressingVerse(null);
    }, 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setPressingVerse(null);
  }, []);

  // Cleanup long-press timer on unmount to prevent stale state updates
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // ── AI Actions ────────────────────────────────────────────────────────────

  const doExplain = useCallback(async () => {
    if (!selectedBible || !activeVerse) return;
    setAiMode('explain');
    setExplanation('');
    setExplaining(true);
    const ref = `${selectedBook.name} ${selectedChapter}:${activeVerse.verse}`;
    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, verseText: activeVerse.text, translation: selectedBible.abbreviationLocal }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setExplanation(text);
      }
    } catch { setExplanation('Could not load. Check your connection.'); }
    finally { setExplaining(false); }
  }, [selectedBible, selectedBook, selectedChapter, activeVerse]);

  const doChapterStudy = useCallback(async () => {
    if (!selectedBible || !passage) return;
    setChapterStudyOpen(true);
    setChapterStudy('');
    setChapterStudying(true);
    const ref = `${selectedBook.name} ${selectedChapter}`;
    const chapterText = passage.verses.map(v => `[v${v.verse}] ${v.text}`).join(' ');
    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, verseText: chapterText, translation: selectedBible.abbreviationLocal, mode: 'chapter' }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setChapterStudy(text);
      }
    } catch { setChapterStudy('Could not load. Check your connection.'); }
    finally { setChapterStudying(false); }
  }, [selectedBible, selectedBook, selectedChapter, passage]);

  const doMultiVerseStudy = useCallback(async () => {
    if (!selectedBible || !passage || selectedVerses.size === 0) return;
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const verses = sorted.map(n => passage.verses.find(v => v.verse === n)).filter(Boolean) as typeof passage.verses;
    if (verses.length === 0) return;
    const isContiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
    const ref = isContiguous && sorted.length > 1
      ? `${selectedBook.name} ${selectedChapter}:${sorted[0]}–${sorted[sorted.length - 1]}`
      : `${selectedBook.name} ${selectedChapter}:${sorted.join(', ')}`;
    const verseText = verses.map(v => `[v${v.verse}] ${v.text}`).join(' ');
    setMultiVerseStudyOpen(true);
    setMultiVerseResult('');
    setMultiVerseLoading(true);
    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, verseText, translation: selectedBible.abbreviationLocal }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMultiVerseResult(text);
      }
    } catch { setMultiVerseResult('Could not load. Check your connection.'); }
    finally { setMultiVerseLoading(false); }
  }, [selectedBible, selectedBook, selectedChapter, passage, selectedVerses]);

  const doCrossRef = useCallback(async () => {
    if (!selectedBible || !activeVerse) return;
    setAiMode('crossref');
    setCrossRefs([]);
    setCrossRefLoading(true);
    const ref = `${selectedBook.name} ${selectedChapter}:${activeVerse.verse}`;
    try {
      const res = await fetch('/api/altar/crossref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, verseText: activeVerse.text, translation: selectedBible.abbreviationLocal }),
      });
      const data = await res.json();
      setCrossRefs(Array.isArray(data) ? data : []);
    } catch { setCrossRefs([]); }
    finally { setCrossRefLoading(false); }
  }, [selectedBible, selectedBook, selectedChapter, activeVerse]);

  const doAsk = useCallback(async (question: string) => {
    if (!selectedBible || !activeVerse || !question.trim()) return;
    setAiMode('ask');
    setAskAnswer('');
    setAsking(true);
    const ref = `${selectedBook.name} ${selectedChapter}:${activeVerse.verse}`;
    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, verseText: activeVerse.text, translation: selectedBible.abbreviationLocal, question }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAskAnswer(text);
      }
    } catch { setAskAnswer('Could not load. Check your connection.'); }
    finally { setAsking(false); }
  }, [selectedBible, selectedBook, selectedChapter, activeVerse]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const scrollToVerse = useCallback((verseNum: number) => {
    const el = document.querySelector(`[data-verse="${verseNum}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight
      (el as HTMLElement).style.transition = 'background 0.3s';
      (el as HTMLElement).style.background = `${accentColor}55`;
      setTimeout(() => {
        (el as HTMLElement).style.background = '';
      }, 1500);
    }
  }, [accentColor]);

  const renderVerse = (v: ParsedVerse, hue: string) => {
    const vKey = `${selectedBook.osis}-${selectedChapter}-${v.verse}`;
    const isActive = activeVerse?.verse === v.verse;
    const isPressing = pressingVerse === v.verse;
    const isMultiSelected = selectedVerses.has(v.verse);

    const handleVerseClick = () => {
      if (speaking) {
        playTTS(v.verse);
      } else if (multiSelectMode) {
        setSelectedVerses(prev => {
          const next = new Set(prev);
          if (next.has(v.verse)) next.delete(v.verse);
          else next.add(v.verse);
          if (next.size === 0) setMultiSelectMode(false);
          return next;
        });
      } else {
        if (activeVerse?.verse === v.verse) {
          setActiveVerse(null);
          setAiMode(null);
        } else {
          setActiveVerse(v);
          setAiMode(null);
          setExplanation('');
          setCrossRefs([]);
          setAskAnswer('');
          setAskInput('');
        }
      }
    };

    return (
      <span key={v.verse}
        data-verse={v.verse}
        onClick={handleVerseClick}
        onMouseDown={() => { /* handled by onClick */ }}
        onMouseUp={() => { /* handled by onClick */ }}
        onMouseLeave={() => { /* handled by onClick */ }}
        onTouchStart={(e) => { e.preventDefault(); startLongPress(v); }}
        onTouchEnd={(e) => { e.preventDefault(); if (longPressTimer.current !== null) { cancelLongPress(); handleVerseClick(); } else { setPressingVerse(null); } }}
        onTouchMove={(e) => { cancelLongPress(); }}
        className="rounded transition-all inline select-none"
        style={{
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: '4px',
          transition: 'background 0.15s, transform 0.15s, opacity 0.15s',
          opacity: isPressing ? 0.65 : multiSelectMode && !isMultiSelected ? 0.45 : 1,
          transform: isPressing ? 'scale(0.97)' : 'scale(1)',
          ...(isMultiSelected
            ? { background: `${accentColor}55`, boxShadow: `0 0 0 2px ${accentColor}`, outline: `2px solid ${accentColor}` }
            : isActive
              ? { background: `${accentColor}44`, boxShadow: `0 0 0 2px ${accentColor}66` }
              : isPressing
                ? { background: `${accentColor}28` }
                : highlighted.has(vKey)
                  ? { background: 'rgba(212,168,83,0.22)' }
                  : {}),
        }}>
        <span className="select-none" style={{
          color: hue, fontSize: '0.58em', fontFamily: 'Montserrat, system-ui, sans-serif',
          fontWeight: 800, verticalAlign: 'super', marginRight: '0.25em', opacity: 0.75,
          letterSpacing: '-0.01em',
        }}>{v.verse}</span>
        {v.text}{' '}
      </span>
    );
  };

  const renderPassage = (p: Passage, hue: string = gold) => {
    if (p.sections && p.sections.length > 0) {
      return (
        <div className="space-y-6">
          {p.sections.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <div className="mb-4 mt-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif', opacity: 0.7 }}>
                    {section.title}
                  </h3>
                  <div className="mt-1.5 h-px w-8" style={{ background: `${accentColor}30` }} />
                </div>
              )}
              <div className={`${fsClass} leading-loose`} style={{ color: txVerse, fontFamily: 'Georgia, serif' }}>
                {section.verses.map(v => renderVerse(v, hue))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className={`${fsClass} leading-loose`} style={{ color: txVerse, fontFamily: 'Georgia, serif' }}>
        {p.verses.map(v => renderVerse(v, hue))}
      </div>
    );
  };

  // Verse jump
  const [verseJump, setVerseJump] = useState('');

  const allBiblesSorted = [...popularBibles, ...otherBibles];

  return (
    <>
      {/* ── Clean Navigation Bar ──────────────────────────────────────────── */}
      <div className="rounded-2xl" style={{ background: cardBg, border: `1px solid ${accentColor}18` }}>

        {/* Row 1: Translation + Compare */}
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${divider}` }}>
          <div className="relative flex-1">
            <button onClick={() => setShowTranslationPicker(v => !v)}
              className="w-full text-left rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: tx1 }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-1.5 py-0.5 rounded" style={{ background: `${accentColor}22`, color: accentColor }}>
                  {selectedBible?.abbreviationLocal || '…'}
                </span>
                <span className="text-xs truncate" style={{ color: 'rgba(232,240,236,0.5)' }}>{selectedBible?.name || 'Select translation'}</span>
              </div>
              <span style={{ color: accentColor }}>▾</span>
            </button>
            {showTranslationPicker && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl flex flex-col max-h-80 overflow-hidden"
                style={{ background: dropBg, border: `1px solid ${dropBorder}`, boxShadow: dropShadow }}>
                {/* Language filter row — only shown when multiple languages are available */}
                {availableLanguages.length > 1 ? (
                  <div className="flex gap-1.5 p-2 overflow-x-auto shrink-0 no-scrollbar" style={{ borderBottom: `1px solid ${divider}` }}>
                    {availableLanguages.map(lang => (
                      <button key={lang.id}
                        onClick={() => { setLanguageFilter(lang.id); setTranslationSearch(''); }}
                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                        style={languageFilter === lang.id
                          ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }
                          : { background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', color: tx3, border: '1px solid transparent' }}>
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="p-2 shrink-0" style={{ borderBottom: `1px solid ${divider}` }}>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} autoFocus value={translationSearch} onChange={e => setTranslationSearch(e.target.value)}
                    placeholder="Search translations…"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: tx1 }} />
                </div>
                <div className="overflow-y-auto">
                  {biblesLoading ? (
                    <p className="px-4 py-6 text-xs text-center" style={{ color: tx3 }}>Loading translations…</p>
                  ) : langBibles.length === 0 ? (
                    <p className="px-4 py-6 text-xs text-center" style={{ color: tx3 }}>No translations available for this language yet.</p>
                  ) : (
                    <>
                      {/* Popular section (English only) */}
                      {popularBibles.length > 0 && (
                        <>
                          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: `${accentColor}55` }}>Most Popular</p>
                          {popularBibles
                            .filter(b => !translationSearch || b.name.toLowerCase().includes(translationSearch.toLowerCase()) || b.abbreviationLocal.toLowerCase().includes(translationSearch.toLowerCase()))
                            .map(b => (
                            <button key={b.id}
                              onClick={() => { setSelectedBible(b); setCompareMode(false); setShowTranslationPicker(false); setTranslationSearch(''); setLanguageFilter(b.languageId || 'eng'); }}
                              className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3"
                              style={selectedBible?.id === b.id ? { color: accentColor, background: `${accentColor}0d`, fontWeight: 600 } : { color: tx2 }}>
                              <span className="text-xs font-black min-w-[3.5rem] px-1.5 py-0.5 rounded text-center"
                                style={selectedBible?.id === b.id ? { background: `${accentColor}22`, color: accentColor } : { background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', color: tx3 }}>
                                {b.abbreviationLocal}
                              </span>
                              <span className="truncate text-xs" style={{ color: tx3 }}>{b.name}</span>
                            </button>
                          ))}
                        </>
                      )}
                      {/* All others */}
                      {filteredOther.length > 0 && (
                        <>
                          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: `${accentColor}33` }}>All Translations</p>
                          {filteredOther.map(b => (
                            <button key={b.id}
                              onClick={() => { setSelectedBible(b); setCompareMode(false); setShowTranslationPicker(false); setTranslationSearch(''); setLanguageFilter(b.languageId || 'eng'); }}
                              className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3"
                              style={selectedBible?.id === b.id ? { color: accentColor, background: `${accentColor}0d`, fontWeight: 600 } : { color: tx2 }}>
                              <span className="text-xs font-bold min-w-[3.5rem] px-1.5 py-0.5 rounded text-center"
                                style={{ background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', color: tx3 }}>
                                {b.abbreviationLocal}
                              </span>
                              <span className="truncate text-xs" style={{ color: tx3 }}>{b.name}</span>
                            </button>
                          ))}
                        </>
                      )}
                      {popularBibles.filter(b => !translationSearch || b.name.toLowerCase().includes(translationSearch.toLowerCase()) || b.abbreviationLocal.toLowerCase().includes(translationSearch.toLowerCase())).length === 0 && filteredOther.length === 0 && (
                        <p className="px-4 py-6 text-xs text-center" style={{ color: tx3 }}>No results for &ldquo;{translationSearch}&rdquo;</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setCompareMode(!compareMode)} className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0"
            style={compareMode
              ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#fff', boxShadow: `0 0 12px ${accentColor}44` }
              : { background: `${accentColor}0d`, color: `${accentColor}88`, border: `1px solid ${accentColor}22` }}>
            ⇄ Compare
          </button>
        </div>

        {/* Compare picker */}
        {compareMode && (
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${divider}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}66` }}>Select up to 3 translations to compare</p>
            <div className="flex flex-wrap gap-1.5">
              {popularBibles.map(b => {
                const on = compareSet.find(x => x.id === b.id);
                return (
                  <button key={b.id} onClick={() => setCompareSet(prev => on ? prev.filter(x => x.id !== b.id) : prev.length < 3 ? [...prev, b] : prev)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={on
                      ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#fff' }
                      : { background: `${accentColor}0d`, color: `${accentColor}66`, border: `1px solid ${accentColor}1a` }}>
                    {b.abbreviationLocal}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 2: Book · Chapter · Verse */}
        <div className="px-4 py-3 flex gap-2 items-center" style={{ borderBottom: `1px solid ${divider}` }}>
          {/* Book picker */}
          <div className="relative flex-1 min-w-0">
            <button onClick={() => { setShowBookList(!showBookList); setShowChapterPicker(false); setShowVersePicker(false); }}
              className="w-full text-left rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2"
              style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}1a`, color: tx1 }}>
              <span className="truncate text-sm font-bold" style={{ letterSpacing: '-0.01em' }}>{selectedBook.name}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: accentColor, flexShrink: 0 }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showBookList && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl max-h-72 flex flex-col overflow-hidden"
                style={{ background: dropBg, border: `1px solid ${accentColor}20`, boxShadow: `${dropShadow}, 0 0 0 1px ${accentColor}08` }}>
                <div className="p-2.5 shrink-0" style={{ borderBottom: `1px solid ${accentColor}0d` }}>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} autoFocus value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Search books…"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: tx1 }} />
                </div>
                <div className="overflow-y-auto">
                  <p className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: `${accentColor}40` }}>Old Testament</p>
                  {BOOKS.slice(0, 39).filter(b => b.name.toLowerCase().includes(bookSearch.toLowerCase())).map(book => (
                    <button key={book.osis}
                      onClick={() => { setSelectedBook(book); setSelectedChapter(1); setShowBookList(false); setBookSearch(''); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-all"
                      style={book.osis === selectedBook.osis ? { color: accentColor, background: `${accentColor}12`, fontWeight: 700 } : { color: tx2 }}>
                      {book.name}
                    </button>
                  ))}
                  <p className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: `${accentColor}40` }}>New Testament</p>
                  {BOOKS.slice(39).filter(b => b.name.toLowerCase().includes(bookSearch.toLowerCase())).map(book => (
                    <button key={book.osis}
                      onClick={() => { setSelectedBook(book); setSelectedChapter(1); setShowBookList(false); setBookSearch(''); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-all"
                      style={book.osis === selectedBook.osis ? { color: accentColor, background: `${accentColor}12`, fontWeight: 700 } : { color: tx2 }}>
                      {book.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chapter picker */}
          <div className="relative shrink-0">
            <button onClick={() => { setShowChapterPicker(!showChapterPicker); setShowBookList(false); setShowVersePicker(false); }}
              className="rounded-2xl px-4 py-2.5 flex items-center gap-1.5"
              style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}1a`, color: tx1 }}>
              <span className="text-sm font-bold">{selectedChapter}</span>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ color: accentColor }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showChapterPicker && (
              <div className="absolute top-full right-0 z-50 mt-2 rounded-2xl overflow-hidden"
                style={{ background: dropBg, border: `1px solid ${accentColor}20`, boxShadow: dropShadow, width: 160 }}>
                <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
                  <p className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: `${accentColor}40` }}>Chapter</p>
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
                    <button key={ch}
                      onClick={() => { setSelectedChapter(ch); setShowChapterPicker(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-all"
                      style={ch === selectedChapter ? { color: accentColor, background: `${accentColor}12`, fontWeight: 700 } : { color: tx2 }}>
                      Chapter {ch}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Verse jump */}
          {passage && (
            <div className="relative shrink-0">
              <button onClick={() => { setShowVersePicker(!showVersePicker); setShowBookList(false); setShowChapterPicker(false); }}
                className="rounded-2xl px-3 py-2.5 flex items-center gap-1"
                style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}14`, color: `${accentColor}88` }}>
                <span className="text-xs font-bold">vs</span>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ color: `${accentColor}66` }}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {showVersePicker && (
                <div className="absolute top-full right-0 z-50 mt-2 rounded-2xl overflow-hidden"
                  style={{ background: dropBg, border: `1px solid ${accentColor}20`, boxShadow: dropShadow, width: 140 }}>
                  <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                    <p className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: `${accentColor}40` }}>Jump to Verse</p>
                    {passage.verses.map(v => (
                      <button key={v.verse}
                        onClick={() => {
                          setShowVersePicker(false);
                          if (speaking) playTTS(v.verse);
                          setTimeout(() => scrollToVerse(v.verse), 80);
                        }}
                        className="w-full text-left px-4 py-2 text-sm transition-all"
                        style={{ color: tx2 }}>
                        Verse {v.verse}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 3: Prev / Current / Next + Overview */}
        <div className="px-4 py-2 flex items-center justify-between gap-2">
          <button onClick={() => navigate('prev')}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0"
            style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: accentColor }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="text-center flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: `${accentColor}33` }}>{isOT ? 'Old Testament' : 'New Testament'}</p>
            <p className="text-sm font-black truncate" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.01em' }}>
              {selectedBook.name} <span style={{ opacity: 0.7 }}>{selectedChapter}</span>
            </p>
          </div>
          <button onClick={() => navigate('next')}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0"
            style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: accentColor }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {BOOK_DEEP_STUDY[selectedBook.name] && (
            <button onClick={() => setDeepStudyOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
              style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20`, color: accentColor }}>
              <span style={{ fontSize: 12 }}>📖</span>
              <span>Overview</span>
            </button>
          )}
        </div>
      </div>

      {/* Passage */}
      {compareMode ? (
        compareLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
          </div>
        ) : (
          <div className={`grid gap-3 ${compareSet.length === 2 ? 'md:grid-cols-2' : compareSet.length >= 3 ? 'md:grid-cols-3' : ''}`}>
            {compareSet.map((b, i) => {
              const p = comparePassages[b.id];
              const hues = [accentColor, '#6366f1', '#10b981'];
              const hue = hues[i % hues.length];
              return (
                <div key={b.id} className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${hue}25` }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full" style={{ background: hue }} />
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: hue }}>{b.abbreviationLocal}</p>
                    <p className="text-xs truncate" style={{ color: tx3 }}>{b.name}</p>
                  </div>
                  {p ? (
                    <div className={`${fsClass} leading-loose`} style={{ color: txVerse, fontFamily: 'Georgia, serif' }}>
                      {p.verses.map(v => (
                        <span key={v.verse}>
                          <sup className="font-bold mr-1" style={{ color: hue, fontSize: '0.6em', fontFamily: 'system-ui' }}>{v.verse}</sup>
                          {v.text}{' '}
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-sm italic" style={{ color: tx3 }}>Loading…</p>}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <>
          {/* Book overview — shown at top when chapter 1 is loaded */}
          {!loading && passage && selectedChapter === 1 && BOOK_DEEP_STUDY[selectedBook.name] && (() => {
            const ov = BOOK_DEEP_STUDY[selectedBook.name];
            return (
              <div className="rounded-2xl p-5 space-y-3" style={{ background: `${accentColor}06`, border: `1px solid ${accentColor}1a` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}88` }}>Book Overview</p>
                  </div>
                </div>
                <h3 className="text-base font-black uppercase tracking-wide" style={{ color: tx1, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                  {selectedBook.name}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-3" style={{ background: cardBg, border: `1px solid ${accentColor}0d` }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: `${accentColor}55` }}>Written by</p>
                    <p className="text-xs font-semibold" style={{ color: tx1, fontFamily: 'Georgia, serif' }}>{ov.author}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: cardBg, border: `1px solid ${accentColor}0d` }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: `${accentColor}55` }}>When</p>
                    <p className="text-xs font-semibold" style={{ color: tx1, fontFamily: 'Georgia, serif' }}>{ov.when}</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: tx2, fontFamily: 'Georgia, serif' }}>{ov.bigIdea}</p>
                <button
                  onClick={() => setDeepStudyOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-black uppercase tracking-widest text-[11px] transition-all active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}0d)`, border: `1px solid ${accentColor}33`, color: accentColor }}
                >
                  <span>📖</span>
                  <span>Deep Study</span>
                  <span style={{ opacity: 0.6 }}>→</span>
                </button>
              </div>
            );
          })()}

          {/* Listen to this chapter — bold & beautiful */}
          {!loading && passage && (
            <>
              <style dangerouslySetInnerHTML={{ __html: `@keyframes soundWave { 0% { height: 4px; } 100% { height: 20px; } }` }} />
              {speaking ? (
                <div className="rounded-2xl p-4 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${accentColor}14, ${accentColor}08)`, border: `1px solid ${accentColor}30`, boxShadow: `0 4px 20px ${accentColor}15` }}>
                  {/* Ambient glow */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 30% 50%, ${accentColor}0a, transparent 60%)` }} />
                  <div className="flex items-center gap-3 relative z-10">
                    <button onClick={toggleTTS}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, boxShadow: `0 0 24px ${accentColor}44` }}>
                      <span className="text-lg text-white">⏸</span>
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-black uppercase tracking-wider" style={{ color: '#fff', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Now Playing</p>
                      <p className="text-[10px] mt-0.5" style={{ color: `${accentColor}88` }}>{selectedBook.name} {selectedChapter} · {passage.verses.length} verses</p>
                    </div>
                    {/* Sound wave bars + stop button */}
                    <div className="flex items-end gap-1 shrink-0">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1 rounded-full" style={{
                          background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)`,
                          animation: `soundWave ${0.3 + i * 0.08}s ease-in-out ${i * 0.05}s infinite alternate`,
                        }} />
                      ))}
                    </div>
                    <button onClick={stopTTS}
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <span className="text-sm" style={{ color: '#ef4444' }}>■</span>
                    </button>
                  </div>
                </div>
              ) : ttsLoading ? (
                <div className="rounded-2xl p-4 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${accentColor}10, ${accentColor}06)`, border: `1px solid ${accentColor}22` }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`, border: `1px solid ${accentColor}28` }}>
                      <svg className="w-5 h-5 animate-spin" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black uppercase tracking-wider" style={{ color: '#fff', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Generating Audio…</p>
                      <p className="text-[10px] mt-0.5" style={{ color: `${accentColor}66` }}>This takes a few seconds</p>
                    </div>
                    <button onClick={stopTTS}
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                      <span className="text-sm" style={{ color: '#ef4444' }}>✕</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={toggleTTS}
                  className="w-full rounded-2xl p-4 text-left transition-all group relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${accentColor}0c, ${accentColor}04)`, border: `1px solid ${accentColor}1a` }}>
                  <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 80% 50%, ${accentColor}06, transparent 60%)` }} />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`, border: `1px solid ${accentColor}28`, boxShadow: `0 0 16px ${accentColor}0d` }}>
                      <span className="text-xl">🎧</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black uppercase tracking-wider" style={{ color: '#fff', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Listen to This Chapter</p>
                      <p className="text-[10px] mt-0.5" style={{ color: `${accentColor}55` }}>
                        {(ttsVoice || '').startsWith('eleven:') ? 'Premium AI narration' : 'Have Scripture read aloud to you'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ background: `${accentColor}18` }}>
                      <span className="text-lg" style={{ color: accentColor }}>▶</span>
                    </div>
                  </div>
                </button>
              )}
            </>
          )}

          {/* Passage */}
          <div>
            {/* Chapter heading */}
            {!loading && passage && (
              <div className="flex items-end gap-4 mb-6 px-1">
                <span className="font-black leading-none select-none" style={{
                  fontSize: 72, color: `${accentColor}12`,
                  fontFamily: 'Montserrat, system-ui, sans-serif', lineHeight: 1,
                }}>
                  {selectedChapter}
                </span>
                <div className="pb-1">
                  <h2 className="font-black text-xl leading-tight" style={{ color: tx1, fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.02em' }}>
                    {selectedBook.name}
                  </h2>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: `${accentColor}44` }}>
                    {passage?.translationName || selectedBible?.name}
                  </p>
                </div>
              </div>
            )}

            {/* Verses */}
            <div className="min-h-48">
              {loading && <div className="flex justify-center items-center h-40"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} /></div>}
              {error && <p className="text-center py-8 text-sm" style={{ color: '#ef4444' }}>{error}</p>}
              {!loading && !error && passage && (
                <>
                  {renderPassage(passage, accentColor)}
                  <p className="text-xs mt-6 text-center" style={{ color: `${accentColor}25` }}>Tap any verse for AI tools</p>
                </>
              )}
            </div>
          </div>


          {/* ── AI Verse Panel (outside the passage card) ──────────────────── */}
          {activeVerse && !loading && (
            <div ref={panelRef} className="rounded-2xl" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}33`, boxShadow: `0 8px 32px rgba(0,0,0,0.3)` }}>
              {/* Selected verse quote */}
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${accentColor}1a` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                    {selectedBook.name} {selectedChapter}:{activeVerse.verse}
                  </p>
                  <button onClick={() => { setActiveVerse(null); setAiMode(null); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                    style={{ color: tx3, background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}>
                    ✕
                  </button>
                </div>
                <p className="text-sm italic leading-relaxed" style={{ color: txVerse, fontFamily: 'Georgia, serif' }}>
                  &ldquo;{activeVerse.text}&rdquo;
                </p>
              </div>

              {/* Action buttons — filtered by experience */}
              <div className="px-5 py-3 flex gap-2 flex-wrap" style={{ borderBottom: `1px solid ${accentColor}12` }}>
                {([
                  { id: 'highlight' as const, label: 'Highlight', icon: '✦', min: 'beginner' as const },
                  { id: 'explain' as const, label: 'Explain', icon: '📖', min: 'intermediate' as const },
                  { id: 'crossref' as const, label: 'Cross-Ref', icon: '🔗', min: 'intermediate' as const },
                  { id: 'ask' as const, label: 'Ask', icon: '💬', min: 'expert' as const },
                ]).filter(b => {
                  const order = { beginner: 0, intermediate: 1, expert: 2 };
                  return order[experienceLevel] >= order[b.min];
                }).map(btn => {
                  const vKey = `${selectedBook.osis}-${selectedChapter}-${activeVerse.verse}`;
                  const isHighlighted = highlighted.has(vKey);
                  const isActive = aiMode === btn.id;

                  return (
                    <button key={btn.id}
                      onClick={() => {
                        if (btn.id === 'highlight') {
                          toggleHighlight(vKey);
                        } else if (btn.id === 'explain') {
                          doExplain();
                        } else if (btn.id === 'crossref') {
                          doCrossRef();
                        } else {
                          setAiMode('ask');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                      style={isActive
                        ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 0 12px ${accentColor}44` }
                        : btn.id === 'highlight' && isHighlighted
                          ? { background: 'rgba(212,168,83,0.2)', color: gold, border: `1px solid ${goldBorder}` }
                          : { background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', color: tx2, border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'}` }}>
                      <span>{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* AI response area */}
              <div className="px-5 py-5">
                {/* Explain */}
                {aiMode === 'explain' && (
                  <>
                    {explaining && !explanation && (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                        <p className="text-sm" style={{ color: tx3 }}>Breaking down this verse…</p>
                      </div>
                    )}
                    {explanation && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: txVerse, fontFamily: 'Georgia, serif' }}>
                        {cleanMarkdown(explanation)}
                        {explaining && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: accentColor, borderRadius: 1 }} />}
                      </div>
                    )}
                  </>
                )}

                {/* Cross-references */}
                {aiMode === 'crossref' && (
                  <>
                    {crossRefLoading && (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                        <p className="text-sm" style={{ color: tx3 }}>Finding cross-references…</p>
                      </div>
                    )}
                    {crossRefs.length > 0 && (
                      <div className="space-y-3">
                        {crossRefs.map((cr, i) => (
                          <div key={i} className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}` }}>
                            <p className="text-xs font-bold mb-1" style={{ color: accentColor }}>{cr.ref}</p>
                            <p className="text-sm italic mb-1.5" style={{ color: tx2, fontFamily: 'Georgia, serif' }}>
                              &ldquo;{cr.quote}&rdquo;
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: tx3 }}>{cr.connection}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!crossRefLoading && crossRefs.length === 0 && (
                      <p className="text-sm" style={{ color: tx3 }}>No cross-references found.</p>
                    )}
                  </>
                )}

                {/* Ask */}
                {aiMode === 'ask' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={askInput} onChange={e => setAskInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && askInput.trim()) { doAsk(askInput); setAskInput(''); } }}
                        placeholder="Ask anything about this verse…"
                        autoFocus
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                        style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: tx1 }} />
                      <button onClick={() => { if (askInput.trim()) { doAsk(askInput); setAskInput(''); } }}
                        disabled={asking || !askInput.trim()}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                        style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }}>
                        Ask
                      </button>
                    </div>
                    {asking && !askAnswer && (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                        <p className="text-sm" style={{ color: tx3 }}>Thinking…</p>
                      </div>
                    )}
                    {askAnswer && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: txVerse, fontFamily: 'Georgia, serif' }}>
                        {cleanMarkdown(askAnswer)}
                        {asking && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: accentColor, borderRadius: 1 }} />}
                      </div>
                    )}
                  </div>
                )}

                {/* No mode yet */}
                {!aiMode && (
                  <p className="text-xs text-center py-2" style={{ color: tx3 }}>
                    Choose an action above to explore this verse
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Notes — journal style with dated entries */}
      <div>
        <button onClick={() => setShowNotes(n => !n)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: `${accentColor}88` }}>
          <span>✍ Study Notes — {selectedBook.name} {selectedChapter}</span>
          <span className="text-xs">{showNotes ? '▲' : '▼'}</span>
        </button>
        {showNotes && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${accentColor}15`, background: 'rgba(255,255,255,0.015)' }}>
            {/* New note input */}
            <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Write a new reflection or insight…"
              className="w-full px-5 py-4 text-sm outline-none resize-none min-h-24"
              style={{ background: 'transparent', color: txVerse, fontFamily: 'Georgia, serif', lineHeight: '1.8' }} />
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${accentColor}08` }}>
              {onShareNote && note.trim() && (
                <button onClick={() => {
                  saveNote(noteKey, note);
                  onShareNote(note, selectedBook.name, selectedChapter);
                }}
                  className="px-4 py-2 rounded-lg text-xs font-bold"
                  style={{ background: `${accentColor}14`, color: accentColor, border: `1px solid ${accentColor}22` }}>
                  Share to Community
                </button>
              )}
              <button onClick={() => {
                if (!note.trim()) return;
                // Save as dated entry — append to existing with timestamp
                const existing = notes[noteKey] || '';
                const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
                const newEntry = `[${timestamp}]\n${note.trim()}`;
                const updated = existing ? `${newEntry}\n\n---\n\n${existing}` : newEntry;
                saveNote(noteKey, updated);
                setNote('');
              }} className="px-4 py-2 rounded-lg text-xs font-bold ml-auto"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 10px ${accentColor}33` }}>
                Add Note
              </button>
            </div>

            {/* Previous notes */}
            {notes[noteKey] && (
              <div className="px-5 py-4" style={{ borderTop: `1px solid ${accentColor}08` }}>
                <p className="text-[9px] font-black uppercase tracking-wider mb-3" style={{ color: `${accentColor}55` }}>Previous Notes</p>
                <div className="space-y-3">
                  {notes[noteKey].split('\n\n---\n\n').map((entry, i) => {
                    const lines = entry.split('\n');
                    const dateLine = lines[0]?.match(/^\[(.+)\]$/)?.[1];
                    const body = dateLine ? lines.slice(1).join('\n') : entry;
                    return (
                      <div key={i} className="rounded-lg p-3 relative group" style={{ background: `${accentColor}06`, borderLeft: `2px solid ${accentColor}22` }}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {dateLine && (
                              <p className="text-[9px] font-bold mb-1" style={{ color: `${accentColor}66` }}>{dateLine}</p>
                            )}
                            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: tx2, fontFamily: 'Georgia, serif' }}>
                              {body.trim()}
                            </p>
                          </div>
                          <button onClick={() => {
                            if (!window.confirm('Delete this note?')) return;
                            const entries = notes[noteKey].split('\n\n---\n\n');
                            entries.splice(i, 1);
                            saveNote(noteKey, entries.join('\n\n---\n\n'));
                          }} className="shrink-0 ml-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'rgba(239,68,68,0.5)' }}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Quiz card */}
      {!loading && passage && (
        <button onClick={startQuiz}
          className="w-full rounded-2xl p-4 text-left transition-all group relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accentColor}0c, ${accentColor}04)`, border: `1px solid ${accentColor}1a` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 20% 50%, ${accentColor}06, transparent 60%)` }} />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`, border: `1px solid ${accentColor}28`, boxShadow: `0 0 16px ${accentColor}0d` }}>
              <span className="text-xl">🧠</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-wider" style={{ color: '#fff', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Generate Quiz</p>
              <p className="text-[10px] mt-0.5" style={{ color: `${accentColor}55` }}>
                Test your knowledge of this chapter with AI-powered questions
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: `${accentColor}18` }}>
              <span className="text-lg" style={{ color: accentColor }}>→</span>
            </div>
          </div>
        </button>
      )}

      {/* Deep Study: This Chapter button */}
      {!loading && passage && (
        <button onClick={doChapterStudy}
          className="w-full rounded-2xl p-4 text-left transition-all group relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accentColor}0c, ${accentColor}04)`, border: `1px solid ${accentColor}1a` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 80% 50%, ${accentColor}06, transparent 60%)` }} />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`, border: `1px solid ${accentColor}28`, boxShadow: `0 0 16px ${accentColor}0d` }}>
              <span className="text-xl">📜</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-wider" style={{ color: '#fff', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Deep Study: This Chapter</p>
              <p className="text-[10px] mt-0.5" style={{ color: `${accentColor}55` }}>
                AI-powered breakdown of {selectedBook.name} {selectedChapter} — themes, context &amp; meaning
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: `${accentColor}18` }}>
              <span className="text-lg" style={{ color: accentColor }}>→</span>
            </div>
          </div>
        </button>
      )}

      {/* Saved verses for this chapter */}
      {(() => {
        const chapterHighlights = [...highlighted].filter(k => {
          const parts = k.split('-');
          return parts[0] === selectedBook.osis && parts[1] === String(selectedChapter);
        }).sort((a, b) => parseInt(a.split('-')[2]) - parseInt(b.split('-')[2]));
        if (chapterHighlights.length === 0) return null;
        return (
          <div className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${accentColor}12` }}>
            <p className="text-[10px] font-black uppercase tracking-wider mb-3" style={{ color: `${accentColor}88`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
              Saved from {selectedBook.name} {selectedChapter}
            </p>
            <div className="space-y-2">
              {chapterHighlights.map(key => {
                const verseNum = parseInt(key.split('-')[2]);
                const verseData = passage?.verses.find(v => v.verse === verseNum);
                const verseText = verseData?.text || '';
                return (
                  <button key={key} onClick={() => scrollToVerse(verseNum)}
                    className="w-full text-left rounded-xl p-3 transition-all active:scale-[0.98]"
                    style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}15` }}>
                    <p className="text-[10px] font-bold mb-1" style={{ color: accentColor }}>{selectedBook.name} {selectedChapter}:{verseNum}</p>
                    <p className="text-xs leading-relaxed italic" style={{ color: tx2, fontFamily: 'Georgia, serif' }}>
                      {verseText.length > 120 ? verseText.slice(0, 120) + '…' : verseText}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Spacer so fixed quick bar / bottom nav doesn't cover bottom content */}
      <div className={activeVerse && !loading && !showQuiz ? 'h-36' : 'h-24'} />

      {/* ── Quiz Overlay ──────────────────────────────────────────────────── */}
      {showQuiz && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0f0c' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${accentColor}1a` }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>Chapter Quiz</p>
              <p className="text-[10px] mt-0.5" style={{ color: tx3 }}>
                {selectedBook.name} {selectedChapter}
              </p>
            </div>
            <button onClick={() => setShowQuiz(false)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all"
              style={{ color: tx2, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'}` }}>
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            {/* Loading */}
            {quizLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                <p className="text-sm" style={{ color: tx2 }}>Generating quiz questions...</p>
                <p className="text-[10px]" style={{ color: tx3 }}>AI is crafting thoughtful questions from this chapter</p>
              </div>
            )}

            {/* Error / empty */}
            {!quizLoading && quizQuestions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-sm" style={{ color: tx2 }}>Could not generate quiz. Please try again.</p>
                <button onClick={startQuiz}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }}>
                  Retry
                </button>
              </div>
            )}

            {/* Score summary */}
            {quizFinished && quizQuestions.length > 0 && (() => {
              // Save quiz result to localStorage
              try {
                const results = JSON.parse(localStorage.getItem('trace-quiz-results') || '[]');
                const thisResult = { book: selectedBook.name, chapter: selectedChapter, score: quizScore, total: quizQuestions.length, date: new Date().toISOString() };
                // Only save if not already saved for this render
                if (!results.find((r: any) => r.date === thisResult.date)) {
                  // Check if we already saved this specific quiz (same book/chapter and within last 5 seconds)
                  const recent = results[results.length - 1];
                  if (!recent || recent.book !== thisResult.book || recent.chapter !== thisResult.chapter || Date.now() - new Date(recent.date).getTime() > 5000) {
                    results.push(thisResult);
                    localStorage.setItem('trace-quiz-results', JSON.stringify(results.slice(-100)));
                  }
                }
              } catch {}
              return null;
            })()}
            {quizFinished && quizQuestions.length > 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}0d)`, border: `2px solid ${accentColor}44` }}>
                  <span className="text-4xl font-black" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                    {quizScore}/{quizQuestions.length}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold" style={{ color: tx1, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                    {quizScore === quizQuestions.length ? 'Perfect Score!' : quizScore >= quizQuestions.length * 0.8 ? 'Great Job!' : quizScore >= quizQuestions.length * 0.6 ? 'Good Effort!' : 'Keep Studying!'}
                  </p>
                  <p className="text-xs mt-2" style={{ color: tx3 }}>
                    You got {quizScore} out of {quizQuestions.length} questions correct
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setShowQuiz(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', color: tx2, border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'}` }}>
                    Close
                  </button>
                  <button onClick={startQuiz}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 12px ${accentColor}33` }}>
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Active question */}
            {!quizLoading && !quizFinished && quizQuestions.length > 0 && (() => {
              const q = quizQuestions[quizIndex];
              if (!q) return null;
              return (
                <div className="max-w-lg mx-auto space-y-6">
                  {/* Progress */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)` }} />
                    </div>
                    <p className="text-xs font-bold shrink-0" style={{ color: `${accentColor}88` }}>
                      {quizIndex + 1} / {quizQuestions.length}
                    </p>
                  </div>

                  {/* Question */}
                  <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${accentColor}18` }}>
                    <p className="text-base leading-relaxed font-medium" style={{ color: tx1, fontFamily: 'Georgia, serif' }}>
                      {q.question}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {q.options.map((opt, oi) => {
                      const isSelected = quizSelected === oi;
                      const isCorrect = oi === q.correct;
                      const answered = quizSelected !== null;
                      let optStyle: React.CSSProperties = {
                        background: cardBg,
                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'}`,
                        color: txVerse,
                      };
                      if (answered && isCorrect) {
                        optStyle = {
                          background: 'rgba(34,197,94,0.12)',
                          border: '1px solid rgba(34,197,94,0.4)',
                          color: '#4ade80',
                        };
                      } else if (answered && isSelected && !isCorrect) {
                        optStyle = {
                          background: 'rgba(239,68,68,0.12)',
                          border: '1px solid rgba(239,68,68,0.4)',
                          color: '#f87171',
                        };
                      } else if (answered) {
                        optStyle = {
                          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
                          color: tx3,
                        };
                      }

                      return (
                        <button key={oi} onClick={() => handleQuizAnswer(oi)}
                          disabled={answered}
                          className="w-full text-left rounded-xl px-5 py-4 text-sm transition-all flex items-center gap-3"
                          style={optStyle}>
                          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background: answered && isCorrect ? 'rgba(34,197,94,0.2)' : answered && isSelected ? 'rgba(239,68,68,0.2)' : `${accentColor}14`,
                              color: answered && isCorrect ? '#4ade80' : answered && isSelected ? '#f87171' : `${accentColor}88`,
                            }}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {answered && isCorrect && <span className="text-lg">✓</span>}
                          {answered && isSelected && !isCorrect && <span className="text-lg">✗</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {quizSelected !== null && (
                    <div className="rounded-xl p-4" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}22` }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accentColor }}>Explanation</p>
                      <p className="text-sm leading-relaxed" style={{ color: tx2, fontFamily: 'Georgia, serif' }}>
                        {q.explanation}
                      </p>
                    </div>
                  )}

                  {/* Next button */}
                  {quizSelected !== null && (
                    <button onClick={handleQuizNext}
                      className="w-full py-3.5 rounded-xl text-sm font-bold transition-all"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 16px ${accentColor}33` }}>
                      {quizIndex + 1 >= quizQuestions.length ? 'See Results' : 'Next Question'}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* ── Quick Action Bar (fixed bottom, appears on verse tap) ─────────── */}
      {/* ── Deep Study Overlay ───────────────────────────────────────────── */}
      {deepStudyOpen && BOOK_DEEP_STUDY[selectedBook.name] && (() => {
        const ds = BOOK_DEEP_STUDY[selectedBook.name];
        return (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#060a08' }}>
            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${accentColor}1a` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}66` }}>Deep Study</p>
                  <h2 className="text-xl font-black uppercase tracking-wide mt-0.5" style={{ color: tx1, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                    {selectedBook.name}
                  </h2>
                </div>
                <button
                  onClick={() => setDeepStudyOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'}`, color: tx2 }}
                >✕</button>
              </div>
              {/* Quick meta row */}
              <div className="flex gap-3 mt-3 flex-wrap">
                {[
                  { label: 'Written by', value: ds.author },
                  { label: 'When', value: ds.when },
                  { label: 'Audience', value: ds.audience },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl px-3 py-2" style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18` }}>
                    <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: `${accentColor}55` }}>{label}</p>
                    <p className="text-[10px] font-semibold leading-snug" style={{ color: tx2, fontFamily: 'Georgia, serif', maxWidth: 180 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6" style={{ paddingBottom: 'max(100px, calc(env(safe-area-inset-bottom, 0px) + 100px))' }}>

              {/* Big Idea */}
              <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${accentColor}14, ${accentColor}06)`, border: `1px solid ${accentColor}28` }}>
                <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: `${accentColor}88` }}>The Big Idea</p>
                <p className="text-base font-bold leading-relaxed" style={{ color: tx1, fontFamily: 'Georgia, serif' }}>&ldquo;{ds.bigIdea}&rdquo;</p>
              </div>

              {/* Context */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}88` }}>Historical Context</p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: tx2, fontFamily: 'Georgia, serif' }}>{ds.context}</p>
              </div>

              {/* Themes */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}88` }}>Key Themes</p>
                </div>
                <div className="space-y-2">
                  {ds.themes.map((theme, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: cardBg, border: `1px solid ${accentColor}0d` }}>
                      <span className="text-sm shrink-0 mt-0.5" style={{ color: accentColor }}>◈</span>
                      <p className="text-sm leading-snug" style={{ color: txVerse, fontFamily: 'Georgia, serif' }}>{theme}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outline */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}88` }}>Book Outline</p>
                </div>
                <div className="space-y-2">
                  {ds.outline.map((sec, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: cardBg, border: `1px solid ${accentColor}0d` }}>
                      <div className="w-10 shrink-0 text-center rounded-lg py-1.5" style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}22` }}>
                        <p className="text-[9px] font-black uppercase tracking-wide" style={{ color: accentColor }}>Ch</p>
                        <p className="text-[10px] font-black" style={{ color: tx1 }}>{sec.chapters}</p>
                      </div>
                      <p className="text-sm leading-snug flex-1" style={{ color: txVerse, fontFamily: 'Georgia, serif' }}>{sec.section}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Verses */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}88` }}>Key Verses</p>
                </div>
                <div className="space-y-3">
                  {ds.keyVerses.map((kv, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: cardBg, borderLeft: `3px solid ${accentColor}44` }}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: accentColor }}>{kv.ref}</p>
                      <p className="text-sm leading-relaxed italic" style={{ color: tx2, fontFamily: 'Georgia, serif' }}>&ldquo;{kv.text}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Christ Connection */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.18)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">✝</span>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(212,168,83,0.8)' }}>Christ Connection</p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,220,180,0.75)', fontFamily: 'Georgia, serif' }}>{ds.christConnection}</p>
              </div>

              {/* Application */}
              <div className="rounded-2xl p-5" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}1a` }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🌿</span>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}88` }}>Application</p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: txVerse, fontFamily: 'Georgia, serif' }}>{ds.application}</p>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Chapter Deep Study Overlay ───────────────────────────────────── */}
      {chapterStudyOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#060a08' }}>
          {/* Header */}
          <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${accentColor}1a` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}66` }}>Deep Study</p>
                <h2 className="text-xl font-black uppercase tracking-wide mt-0.5" style={{ color: tx1, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                  {selectedBook.name} {selectedChapter}
                </h2>
              </div>
              <button
                onClick={() => setChapterStudyOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'}`, color: tx2 }}
              >✕</button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4" style={{ paddingBottom: 'max(100px, calc(env(safe-area-inset-bottom, 0px) + 100px))' }}>
            {chapterStudying && (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                <p className="text-sm" style={{ color: tx2 }}>Studying this chapter...</p>
                <p className="text-[10px]" style={{ color: tx3 }}>AI is diving deep into {selectedBook.name} {selectedChapter}</p>
              </div>
            )}

            {!chapterStudying && chapterStudy && (
              <div className="rounded-2xl p-5" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}1a` }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base">📜</span>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}88` }}>Chapter Analysis</p>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: tx2, fontFamily: 'Georgia, serif' }}>{chapterStudy}</p>
              </div>
            )}

            {!chapterStudying && !chapterStudy && (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <p className="text-sm" style={{ color: tx2 }}>Could not load. Please try again.</p>
                <button onClick={doChapterStudy}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }}>
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Multi-verse result overlay ────────────────────────────────────── */}
      {multiVerseStudyOpen && (() => {
        const sorted = [...selectedVerses].sort((a, b) => a - b);
        const isContiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
        const ref = isContiguous && sorted.length > 1
          ? `${selectedBook.name} ${selectedChapter}:${sorted[0]}–${sorted[sorted.length - 1]}`
          : `${selectedBook.name} ${selectedChapter}:${sorted.join(', ')}`;
        return (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#060a08' }}>
            <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${accentColor}1a` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accentColor}66` }}>Study · {sorted.length} Verses</p>
                  <h2 className="text-xl font-black uppercase tracking-wide mt-0.5" style={{ color: tx1, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{ref}</h2>
                </div>
                <button onClick={() => setMultiVerseStudyOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: tx2 }}>✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4" style={{ paddingBottom: 'max(100px, calc(env(safe-area-inset-bottom, 0px) + 100px))' }}>
              {multiVerseLoading && (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                  <p className="text-sm" style={{ color: tx2 }}>Studying {sorted.length} verses together…</p>
                </div>
              )}
              {!multiVerseLoading && multiVerseResult && (
                <div className="rounded-2xl p-5" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}1a` }}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: tx2, fontFamily: 'Georgia, serif' }}>{cleanMarkdown(multiVerseResult)}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Multi-select action bar ───────────────────────────────────────── */}
      {multiSelectMode && !loading && (
        <div className="fixed bottom-0 left-0 right-0 z-[60]"
          style={{ background: 'rgba(6,10,8,0.97)', borderTop: `1px solid ${accentColor}44`, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
          <div className="max-w-lg mx-auto px-4 pt-3" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold" style={{ color: accentColor }}>
                {selectedVerses.size} verse{selectedVerses.size !== 1 ? 's' : ''} selected
              </p>
              <button onClick={() => { setMultiSelectMode(false); setSelectedVerses(new Set()); }}
                className="text-xs px-3 py-1.5 rounded-lg" style={{ color: tx3, background: 'rgba(255,255,255,0.05)' }}>
                Cancel
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { doMultiVerseStudy(); }}
                disabled={selectedVerses.size === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }}>
                <span>📖</span><span>Study Together</span>
              </button>
              <button
                onClick={() => {
                  selectedVerses.forEach(n => {
                    const vKey = `${selectedBook.osis}-${selectedChapter}-${n}`;
                    if (!highlighted.has(vKey)) toggleHighlight(vKey);
                  });
                  setMultiSelectMode(false);
                  setSelectedVerses(new Set());
                }}
                disabled={selectedVerses.size === 0}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40"
                style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853', border: '1px solid rgba(212,168,83,0.3)' }}>
                <span>✦</span><span>Save All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeVerse && !loading && !showQuiz && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[60]"
          style={{
            background: 'rgba(6,10,8,0.97)',
            borderTop: `1px solid ${accentColor}44`,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: `0 -4px 32px rgba(0,0,0,0.6), 0 -1px 0 ${accentColor}22`,
          }}
        >
          <div className="max-w-lg mx-auto px-4 pt-3" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}>
            {/* Verse reference + dismiss */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: accentColor }}>
                  {selectedBook.name} {selectedChapter}:{activeVerse.verse}
                </span>
                {highlighted.has(`${selectedBook.osis}-${selectedChapter}-${activeVerse.verse}`) && (
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(212,168,83,0.18)', color: '#d4a853' }}>
                    ✦ saved
                  </span>
                )}
              </div>
              <button
                onClick={() => { setActiveVerse(null); setAiMode(null); }}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs ml-2"
                style={{ color: tx3, background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
              >
                ✕
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {/* Read from this verse */}
              {ttsEnabled && (
                <button
                  onClick={() => { setActiveVerse(null); playTTS(activeVerse.verse); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold flex-1 justify-center transition-all active:scale-95"
                  style={{ background: speaking ? `${accentColor}22` : `${accentColor}0d`, color: speaking ? accentColor : tx2, border: `1px solid ${accentColor}1c` }}
                >
                  <span>▶</span>
                  <span>From here</span>
                </button>
              )}
              {([
                { id: 'highlight' as const, label: 'Highlight', icon: '✦', min: 'beginner' as const },
                { id: 'explain'   as const, label: 'Explain',   icon: '📖', min: 'intermediate' as const },
                { id: 'crossref'  as const, label: 'Cross-Ref', icon: '🔗', min: 'intermediate' as const },
                { id: 'ask'       as const, label: 'Ask',       icon: '💬', min: 'expert' as const },
              ]).filter(btn => {
                const order = { beginner: 0, intermediate: 1, expert: 2 };
                return order[experienceLevel] >= order[btn.min];
              }).map(btn => {
                const vKey = `${selectedBook.osis}-${selectedChapter}-${activeVerse.verse}`;
                const isHighlighted = highlighted.has(vKey);
                const isActive = aiMode === btn.id;
                return (
                  <button
                    key={btn.id}
                    onClick={() => {
                      if (btn.id === 'highlight') {
                        toggleHighlight(vKey);
                      } else if (btn.id === 'explain') {
                        doExplain();
                        setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
                      } else if (btn.id === 'crossref') {
                        doCrossRef();
                        setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
                      } else {
                        setAiMode('ask');
                        setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold flex-1 justify-center transition-all active:scale-95"
                    style={
                      isActive
                        ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 0 10px ${accentColor}44` }
                        : btn.id === 'highlight' && isHighlighted
                          ? { background: 'rgba(212,168,83,0.18)', color: '#d4a853', border: '1px solid rgba(212,168,83,0.32)' }
                          : { background: `${accentColor}0d`, color: tx2, border: `1px solid ${accentColor}1c` }
                    }
                  >
                    <span>{btn.icon}</span>
                    <span>{btn.id === 'highlight' && isHighlighted ? 'Saved' : btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
