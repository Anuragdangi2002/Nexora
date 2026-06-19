import API from './api';

// ─── Public Movie Endpoints ───────────────────────────────────────────────────

/** Fetches all categorized movies for homepage */
export const getHomepageMovies = () => API.get('/movies/homepage');

/** Fetches full details for a single movie by its ID */
export const getMovieById = (id) => API.get(`/movies/${id}`);

// ─── User Movie Actions ───────────────────────────────────────────────────────

/** Adds a movie to the user's My List */
export const addToMyList = (movieId) => API.post('/movies/my-list', { movieId });

/** Removes a movie from the user's My List */
export const removeFromMyList = (movieId) => API.delete(`/movies/my-list/${movieId}`);

/** Updates user's continue-watching progress for a movie (progress = 0–100) */
export const updateContinueWatching = (movieId, progress) =>
  API.post('/movies/continue-watching', { movieId, progress });

// ─── Admin Movie Endpoints ────────────────────────────────────────────────────

/** Creates a new movie record (Admin only) */
export const adminCreateMovie = (data) => API.post('/admin/movies', data);

/** Updates an existing movie record (Admin only) */
export const adminUpdateMovie = (id, data) => API.put(`/admin/movies/${id}`, data);

/** Deletes a movie record (Admin only) */
export const adminDeleteMovie = (id) => API.delete(`/admin/movies/${id}`);

/** Uploads a thumbnail image for a movie (Admin only) */
export const adminUploadThumbnail = (file) => {
  const formData = new FormData();
  formData.append('thumbnail', file);
  return API.post('/admin/movies/upload-thumbnail', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** Uploads a banner image for a movie (Admin only) */
export const adminUploadBanner = (file) => {
  const formData = new FormData();
  formData.append('banner', file);
  return API.post('/admin/movies/upload-banner', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** Uploads a trailer video for a movie (Admin only) */
export const adminUploadTrailer = (file) => {
  const formData = new FormData();
  formData.append('trailer', file);
  return API.post('/admin/movies/upload-trailer', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
