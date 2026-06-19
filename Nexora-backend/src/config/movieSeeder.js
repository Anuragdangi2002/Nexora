const { db, collection, getDocs, setDoc, doc } = require("./firebase");

const seedMovies = async () => {
  try {
    const moviesRef = collection(db, "movies");
    const snapshot = await getDocs(moviesRef);
    if (!snapshot.empty) {
      console.log("Movies collection already contains data. Skipping seeding.");
      return;
    }

    console.log("Seeding default movies...");
    const sampleVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

    const defaultMovies = [
      {
        id: "movie_001",
        title: "Money Heist",
        description: "A criminal mastermind who goes by \"The Professor\" plans to pull off the biggest heist in recorded history.",
        thumbnail: "/uploads/money_heist_banner.png",
        banner: "/uploads/money_heist_banner.png",
        videoUrl: sampleVideoUrl,
        genre: "Crime",
        category: "Trending",
        rating: 8.5,
        year: 2017,
        featured: true,
        trending: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "movie_002",
        title: "Stranger Things",
        description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
        thumbnail: "/uploads/stranger_things_thumb.png",
        banner: "/uploads/stranger_things_thumb.png",
        videoUrl: sampleVideoUrl,
        genre: "Action",
        category: "Trending",
        rating: 8.7,
        year: 2016,
        featured: false,
        trending: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        id: "movie_003",
        title: "Wednesday",
        description: "Smart, sarcastic and a little dead inside, Wednesday Addams investigates a murder spree while making new friends — and foes — at Nevermore Academy.",
        thumbnail: "/uploads/stranger_things_thumb.png",
        banner: "/uploads/stranger_things_thumb.png",
        videoUrl: sampleVideoUrl,
        genre: "Comedy",
        category: "Trending",
        rating: 8.1,
        year: 2022,
        featured: false,
        trending: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "movie_004",
        title: "Breaking Bad",
        description: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student.",
        thumbnail: "/uploads/money_heist_banner.png",
        banner: "/uploads/money_heist_banner.png",
        videoUrl: sampleVideoUrl,
        genre: "Crime",
        category: "Top Rated",
        rating: 9.5,
        year: 2008,
        featured: false,
        trending: false,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "movie_005",
        title: "The Dark Knight",
        description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        thumbnail: "/uploads/money_heist_banner.png",
        banner: "/uploads/money_heist_banner.png",
        videoUrl: sampleVideoUrl,
        genre: "Action",
        category: "Top Rated",
        rating: 9.0,
        year: 2008,
        featured: false,
        trending: false,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "movie_006",
        title: "Friends",
        description: "Follows the personal and professional lives of six twenty to thirty-something-year-old friends living in Manhattan.",
        thumbnail: "/uploads/stranger_things_thumb.png",
        banner: "/uploads/stranger_things_thumb.png",
        videoUrl: sampleVideoUrl,
        genre: "Comedy",
        category: "Comedy Movies",
        rating: 8.9,
        year: 1994,
        featured: false,
        trending: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "movie_007",
        title: "The Conjuring",
        description: "Paranormal investigators Ed and Lorraine Warren work to help a family terrorized by a dark presence in their farmhouse.",
        thumbnail: "/uploads/stranger_things_thumb.png",
        banner: "/uploads/stranger_things_thumb.png",
        videoUrl: sampleVideoUrl,
        genre: "Horror",
        category: "Horror Movies",
        rating: 7.5,
        year: 2013,
        featured: false,
        trending: false,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "movie_008",
        title: "IT Chapter Two",
        description: "Defeated by the Losers' Club, the evil clown Pennywise returns 27 years later to terrorize the town of Derry once school friends have grown up and gone their separate ways.",
        thumbnail: "/uploads/stranger_things_thumb.png",
        banner: "/uploads/stranger_things_thumb.png",
        videoUrl: sampleVideoUrl,
        genre: "Horror",
        category: "Horror Movies",
        rating: 6.5,
        year: 2019,
        featured: false,
        trending: false,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "movie_009",
        title: "Superbad",
        description: "Two co-dependent high school seniors are forced to deal with separation anxiety after their plan to stage a booze-fueled party goes awry.",
        thumbnail: "/uploads/stranger_things_thumb.png",
        banner: "/uploads/stranger_things_thumb.png",
        videoUrl: sampleVideoUrl,
        genre: "Comedy",
        category: "Comedy Movies",
        rating: 7.6,
        year: 2007,
        featured: false,
        trending: false,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "movie_010",
        title: "Gladiator",
        description: "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.",
        thumbnail: "/uploads/money_heist_banner.png",
        banner: "/uploads/money_heist_banner.png",
        videoUrl: sampleVideoUrl,
        genre: "Action",
        category: "Action Movies",
        rating: 8.5,
        year: 2000,
        featured: false,
        trending: false,
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    for (const movie of defaultMovies) {
      const movieDocRef = doc(db, "movies", movie.id);
      await setDoc(movieDocRef, movie);
    }

    console.log(`Successfully seeded ${defaultMovies.length} default movies!`);
  } catch (error) {
    console.error("Error seeding movies:", error);
  }
};

module.exports = { seedMovies };
