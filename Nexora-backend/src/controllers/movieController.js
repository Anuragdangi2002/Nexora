const { db, collection, getDocs, doc, getDoc, updateDoc } = require("../config/firebase");

// Helper to load all movies
const getAllMoviesFromDb = async () => {
  const moviesRef = collection(db, "movies");
  const snapshot = await getDocs(moviesRef);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

// GET /api/movies/homepage
const getHomepageMovies = async (req, res) => {
  try {
    const user = req.user;
    const allMovies = await getAllMoviesFromDb();

    // 1. Hero Banner: find first featured, or fall back to latest movie
    const heroBanner = allMovies.find(m => m.featured) || allMovies[0] || null;

    // 2. Trending Now: category 'Trending' or trending attribute
    const trendingNow = allMovies.filter(m => m.trending === true || (m.category && m.category.toLowerCase() === "trending"));

    // 3. Continue Watching: joined details based on user's watching progress
    const continueWatching = [];
    const userContinueWatching = user.continueWatching || [];
    for (const cw of userContinueWatching) {
      const movie = allMovies.find(m => m.id === cw.movieId);
      if (movie) {
        continueWatching.push({
          ...movie,
          progress: cw.progress,
          lastWatched: cw.lastWatched
        });
      }
    }

    // 4. Top Rated: sorted by rating desc
    const topRated = [...allMovies].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);

    // 5. Action Movies
    const actionMovies = allMovies.filter(m => m.genre && m.genre.toLowerCase() === "action");

    // 6. Comedy Movies
    const comedyMovies = allMovies.filter(m => m.genre && m.genre.toLowerCase() === "comedy");

    // 7. Horror Movies
    const horrorMovies = allMovies.filter(m => m.genre && m.genre.toLowerCase() === "horror");

    // 8. Recently Added: sorted by createdAt desc
    const recentlyAdded = [...allMovies].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);

    // 9. My List: joined details of user's personal movie list
    const myList = [];
    const userMyList = user.myList || [];
    for (const mId of userMyList) {
      const movie = allMovies.find(m => m.id === mId);
      if (movie) {
        myList.push(movie);
      }
    }

    // 10. Recommended For You: high-rating selection
    const recommendedForYou = allMovies.filter(m => (m.rating || 0) >= 7.5).slice(0, 8);

    return res.status(200).json({
      success: true,
      message: "Homepage movies retrieved successfully",
      data: {
        heroBanner,
        trendingNow,
        continueWatching,
        topRated,
        actionMovies,
        comedyMovies,
        horrorMovies,
        recentlyAdded,
        myList,
        recommendedForYou
      }
    });
  } catch (error) {
    console.error("Error getting homepage movies:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// GET /api/movies/:id
const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    const movieRef = doc(db, "movies", id);
    const movieSnap = await getDoc(movieRef);
    if (!movieSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
        data: null
      });
    }
    return res.status(200).json({
      success: true,
      message: "Movie retrieved successfully",
      data: { id: movieSnap.id, ...movieSnap.data() }
    });
  } catch (error) {
    console.error("Error getting movie by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/movies/my-list
const addToMyList = async (req, res) => {
  try {
    const { movieId } = req.body;
    if (!movieId) {
      return res.status(400).json({
        success: false,
        message: "movieId is required",
        data: null
      });
    }

    // Verify movie exists
    const movieRef = doc(db, "movies", movieId);
    const movieSnap = await getDoc(movieRef);
    if (!movieSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
        data: null
      });
    }

    const userId = req.user.id;
    const userRef = doc(db, "users", userId);
    
    // Fetch fresh user data
    const freshUserSnap = await getDoc(userRef);
    const freshUserData = freshUserSnap.data();
    let currentList = freshUserData.myList || [];

    if (!currentList.includes(movieId)) {
      currentList.push(movieId);
      await updateDoc(userRef, { myList: currentList, updatedAt: new Date().toISOString() });
    }

    return res.status(200).json({
      success: true,
      message: "Movie added to My List successfully",
      data: { myList: currentList }
    });
  } catch (error) {
    console.error("Error adding to My List:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// DELETE /api/movies/my-list/:id
const removeFromMyList = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRef = doc(db, "users", userId);

    const freshUserSnap = await getDoc(userRef);
    const freshUserData = freshUserSnap.data();
    let currentList = freshUserData.myList || [];

    if (currentList.includes(id)) {
      currentList = currentList.filter(mId => mId !== id);
      await updateDoc(userRef, { myList: currentList, updatedAt: new Date().toISOString() });
    }

    return res.status(200).json({
      success: true,
      message: "Movie removed from My List successfully",
      data: { myList: currentList }
    });
  } catch (error) {
    console.error("Error removing from My List:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/movies/continue-watching
const updateContinueWatching = async (req, res) => {
  try {
    const { movieId, progress } = req.body;
    if (!movieId || progress === undefined) {
      return res.status(400).json({
        success: false,
        message: "movieId and progress are required",
        data: null
      });
    }

    // Verify movie exists
    const movieRef = doc(db, "movies", movieId);
    const movieSnap = await getDoc(movieRef);
    if (!movieSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
        data: null
      });
    }

    const userId = req.user.id;
    const userRef = doc(db, "users", userId);

    const freshUserSnap = await getDoc(userRef);
    const freshUserData = freshUserSnap.data();
    let continueWatchingList = freshUserData.continueWatching || [];

    // Find and update or add
    const existingIndex = continueWatchingList.findIndex(item => item.movieId === movieId);
    if (existingIndex > -1) {
      continueWatchingList[existingIndex] = {
        movieId,
        progress: Number(progress),
        lastWatched: new Date().toISOString()
      };
    } else {
      continueWatchingList.push({
        movieId,
        progress: Number(progress),
        lastWatched: new Date().toISOString()
      });
    }

    // Sort so the latest updated is first
    continueWatchingList.sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));

    await updateDoc(userRef, { continueWatching: continueWatchingList, updatedAt: new Date().toISOString() });

    return res.status(200).json({
      success: true,
      message: "Continue Watching progress updated successfully",
      data: { continueWatching: continueWatchingList }
    });
  } catch (error) {
    console.error("Error updating Continue Watching:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

module.exports = {
  getHomepageMovies,
  getMovieById,
  addToMyList,
  removeFromMyList,
  updateContinueWatching
};
