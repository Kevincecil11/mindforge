/*
  MindForge — extra quotes (static)
  ---------------------------------
  These are the same quotes that live in the database, written straight into
  the page so they work on GitHub Pages with no backend at all.

  Pushes onto the Q array from index.html, skips anything already there,
  registers any new theme as a filter chip, then re-renders.
*/
(function () {
  'use strict';

  var LABELS = { movies: 'Movies' };

  var EXTRA = [
    {q:"Why do we fall, sir? So that we can learn to pick ourselves up.",a:"Alfred Pennyworth",s:"Batman Begins",t:["movies","feeling-low","courage"]},
    {q:"It ain't about how hard you hit. It's about how hard you can get hit and keep moving forward.",a:"Rocky Balboa",s:"Rocky Balboa",t:["movies","motivation","discipline"]},
    {q:"Get busy living or get busy dying.",a:"Andy Dufresne",s:"The Shawshank Redemption",t:["movies","motivation"]},
    {q:"Hope is a good thing, maybe the best of things. And no good thing ever dies.",a:"Andy Dufresne",s:"The Shawshank Redemption",t:["movies","feeling-low"]},
    {q:"Do. Or do not. There is no try.",a:"Yoda",s:"The Empire Strikes Back",t:["movies","discipline"]},
    {q:"The night is darkest just before the dawn. And I promise you, the dawn is coming.",a:"Harvey Dent",s:"The Dark Knight",t:["movies","feeling-low"]},
    {q:"Every man dies. Not every man really lives.",a:"William Wallace",s:"Braveheart",t:["movies","courage"]},
    {q:"It is not our abilities that show what we truly are. It is our choices.",a:"Albus Dumbledore",s:"Harry Potter and the Chamber of Secrets",t:["movies","mindset"]},
    {q:"Carpe diem. Seize the day, boys. Make your lives extraordinary.",a:"John Keating",s:"Dead Poets Society",t:["movies","motivation"]},
    {q:"Sometimes it is the people who no one imagines anything of who do the things that no one can imagine.",a:"Alan Turing",s:"The Imitation Game",t:["movies","self-belief"]},
    {q:"All we have to decide is what to do with the time that is given us.",a:"Gandalf",s:"The Lord of the Rings",t:["movies","mindset"]},
    {q:"Even the smallest person can change the course of the future.",a:"Galadriel",s:"The Lord of the Rings",t:["movies","self-belief"]},
    {q:"There's some good in this world, and it's worth fighting for.",a:"Samwise Gamgee",s:"The Lord of the Rings",t:["movies","courage"]},
    {q:"It's not who I am underneath, but what I do that defines me.",a:"Bruce Wayne",s:"Batman Begins",t:["movies","mindset"]},
    {q:"You mustn't be afraid to dream a little bigger, darling.",a:"Eames",s:"Inception",t:["movies","self-belief"]},
    {q:"We must all face the choice between what is right and what is easy.",a:"Albus Dumbledore",s:"Harry Potter and the Goblet of Fire",t:["movies","courage"]},
    {q:"Happiness can be found even in the darkest of times, if one only remembers to turn on the light.",a:"Albus Dumbledore",s:"Harry Potter and the Prisoner of Azkaban",t:["movies","feeling-low","gratitude"]},
    {q:"The past can hurt. But the way I see it, you can either run from it, or learn from it.",a:"Rafiki",s:"The Lion King",t:["movies","feeling-low"]},
    {q:"Life moves pretty fast. If you don't stop and look around once in a while, you could miss it.",a:"Ferris Bueller",s:"Ferris Bueller's Day Off",t:["movies","gratitude"]},
    {q:"Great men are not born great, they grow great.",a:"Vito Corleone",s:"The Godfather",t:["movies","discipline"]},
    {q:"The greatest teacher, failure is.",a:"Yoda",s:"Star Wars: The Last Jedi",t:["movies","mindset","feeling-low"]},
    {q:"Fear is the path to the dark side.",a:"Yoda",s:"Star Wars: The Phantom Menace",t:["movies","courage"]},
    {q:"Our lives are defined by opportunities, even the ones we miss.",a:"Benjamin Button",s:"The Curious Case of Benjamin Button",t:["movies","mindset"]},
    {q:"Just keep swimming.",a:"Dory",s:"Finding Nemo",t:["movies","feeling-low","discipline"]},

    {q:"There is nothing impossible to him who will try.",a:"Alexander the Great",t:["motivation","self-belief"]},
    {q:"I am not afraid of an army of lions led by a sheep; I am afraid of an army of sheep led by a lion.",a:"Alexander the Great",t:["power","strategy"]},
    {q:"Remember upon the conduct of each depends the fate of all.",a:"Alexander the Great",t:["power","discipline"]},
    {q:"I would rather live a short life of glory than a long one of obscurity.",a:"Alexander the Great",t:["courage","motivation"]},
    {q:"Glory crowns the deeds of those who expose themselves to toil and danger.",a:"Alexander the Great",t:["courage","discipline"]},

    {q:"Victory belongs to the most persevering.",a:"Napoleon Bonaparte",t:["discipline","motivation"]},
    {q:"Impossible is a word to be found only in the dictionary of fools.",a:"Napoleon Bonaparte",t:["self-belief","motivation"]},
    {q:"A leader is a dealer in hope.",a:"Napoleon Bonaparte",t:["power"]},
    {q:"He who fears being conquered is sure of defeat.",a:"Napoleon Bonaparte",t:["courage","power"]},
    {q:"Take time to deliberate, but when the time for action has arrived, stop thinking and go in.",a:"Napoleon Bonaparte",t:["strategy","courage"]},
    {q:"Courage is like love; it must have hope for nourishment.",a:"Napoleon Bonaparte",t:["courage"]},
    {q:"Death is nothing, but to live defeated and inglorious is to die daily.",a:"Napoleon Bonaparte",t:["courage","motivation"]},
    {q:"The battlefield is a scene of constant chaos. The winner will be the one who controls that chaos, both his own and the enemy's.",a:"Napoleon Bonaparte",t:["strategy","power"]},

    {q:"Do not go where the path may lead, go instead where there is no path and leave a trail.",a:"Ralph Waldo Emerson",t:["courage","self-belief"]},
    {q:"To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",a:"Ralph Waldo Emerson",t:["self-belief"]},
    {q:"What you do speaks so loudly that I cannot hear what you say.",a:"Ralph Waldo Emerson",t:["discipline","power"]},
    {q:"Nothing great was ever achieved without enthusiasm.",a:"Ralph Waldo Emerson",t:["motivation"]},
    {q:"The world belongs to the energetic.",a:"Ralph Waldo Emerson",t:["motivation","power"]},
    {q:"A hero is no braver than an ordinary man, but he is braver five minutes longer.",a:"Ralph Waldo Emerson",t:["courage"]},
    {q:"The only way to have a friend is to be one.",a:"Ralph Waldo Emerson",t:["gratitude"]},
    {q:"Once you make a decision, the universe conspires to make it happen.",a:"Ralph Waldo Emerson",t:["self-belief","mindset"]},

    {q:"Success is not final, failure is not fatal: it is the courage to continue that counts.",a:"Winston Churchill",t:["courage","motivation"]},
    {q:"It always seems impossible until it's done.",a:"Nelson Mandela",t:["motivation","self-belief"]},
    {q:"Fall seven times, stand up eight.",a:"Japanese Proverb",t:["feeling-low","discipline"]},
    {q:"A ship in harbor is safe, but that is not what ships are built for.",a:"John A. Shedd",t:["courage"]},
    {q:"Discipline equals freedom.",a:"Jocko Willink",t:["discipline"]},
    {q:"Hard choices, easy life. Easy choices, hard life.",a:"Jerzy Gregorek",t:["discipline","mindset"]},
    {q:"What you seek is seeking you.",a:"Rumi",t:["mindset","self-belief"]},
    {q:"Comparison is the thief of joy.",a:"Theodore Roosevelt",t:["gratitude","mindset"]},
    {q:"Do what you can, with what you have, where you are.",a:"Theodore Roosevelt",t:["motivation","discipline"]},
    {q:"Believe you can and you're halfway there.",a:"Theodore Roosevelt",t:["self-belief"]},
    {q:"If you want to go fast, go alone. If you want to go far, go together.",a:"African Proverb",t:["strategy"]},
    {q:"Whatever you are, be a good one.",a:"Abraham Lincoln",t:["discipline","mindset"]},
    {q:"Amateurs sit and wait for inspiration, the rest of us just get up and go to work.",a:"Stephen King",t:["discipline"]},
    {q:"Energy and persistence conquer all things.",a:"Benjamin Franklin",t:["discipline","motivation"]},
    {q:"The man who moves a mountain begins by carrying away small stones.",a:"Confucius",t:["discipline","strategy"]},
    {q:"Our greatest glory is not in never falling, but in rising every time we fall.",a:"Confucius",t:["feeling-low","courage"]},
    {q:"It does not matter how slowly you go as long as you do not stop.",a:"Confucius",t:["discipline","motivation"]},
    {q:"When you want something, all the universe conspires in helping you to achieve it.",a:"Paulo Coelho",s:"The Alchemist",t:["self-belief","mindset"]},
    {q:"Not all those who wander are lost.",a:"J.R.R. Tolkien",s:"The Fellowship of the Ring",t:["mindset"]},
    {q:"The cave you fear to enter holds the treasure you seek.",a:"Joseph Campbell",t:["courage","feeling-low"]},
    {q:"Turn your wounds into wisdom.",a:"Oprah Winfrey",t:["feeling-low","mindset"]},
    {q:"Be so good they can't ignore you.",a:"Steve Martin",t:["discipline","power"]},
    {q:"Simplicity is the ultimate sophistication.",a:"Leonardo da Vinci",t:["strategy","mindset"]},
    {q:"I have not failed. I've just found 10,000 ways that won't work.",a:"Thomas Edison",t:["feeling-low","discipline"]},
    {q:"Genius is one percent inspiration, ninety-nine percent perspiration.",a:"Thomas Edison",t:["discipline"]},
    {q:"Whatever the mind of man can conceive and believe, it can achieve.",a:"Napoleon Hill",s:"Think and Grow Rich",t:["self-belief","mindset"]},
    {q:"Act as if what you do makes a difference. It does.",a:"William James",t:["motivation","self-belief"]},
    {q:"The best way out is always through.",a:"Robert Frost",t:["feeling-low","courage"]},
    {q:"In the middle of difficulty lies opportunity.",a:"Albert Einstein",t:["feeling-low","strategy"]},
    {q:"Try not to become a man of success, but rather try to become a man of value.",a:"Albert Einstein",t:["mindset"]},
    {q:"Knowing is not enough; we must apply. Willing is not enough; we must do.",a:"Johann Wolfgang von Goethe",t:["discipline"]},
    {q:"Whatever you can do, or dream you can, begin it. Boldness has genius, power and magic in it.",a:"Johann Wolfgang von Goethe",t:["courage","motivation"]},
    {q:"The mind is not a vessel to be filled but a fire to be kindled.",a:"Plutarch",t:["mindset"]},
    {q:"Well begun is half done.",a:"Aristotle",t:["strategy","discipline"]},
    {q:"Strength does not come from physical capacity. It comes from an indomitable will.",a:"Mahatma Gandhi",t:["power","self-belief"]},
    {q:"Everything you've ever wanted is on the other side of fear.",a:"George Addair",t:["courage"]},
    {q:"The best revenge is massive success.",a:"Frank Sinatra",t:["power","motivation"]}
  ];

  function add() {
    if (typeof Q === 'undefined' || !Q.push) return;

    var seen = {};
    Q.forEach(function (item) { seen[item.q] = true; });

    EXTRA.forEach(function (item) {
      if (seen[item.q]) return;
      seen[item.q] = true;
      Q.push(item);
    });

    // Give any new theme a filter chip.
    if (typeof TH !== 'undefined') {
      Q.forEach(function (item) {
        (item.t || []).forEach(function (theme) {
          if (TH[theme]) return;
          TH[theme] = LABELS[theme] ||
            theme.charAt(0).toUpperCase() + theme.slice(1).replace(/-/g, ' ');
        });
      });
    }

    try {
      if (typeof renderChips === 'function') renderChips();
      if (typeof renderQuotes === 'function') renderQuotes();
      if (typeof setHeroQuote === 'function') setHeroQuote(false);
    } catch (e) { /* best effort */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', add);
  } else {
    add();
  }
})();
