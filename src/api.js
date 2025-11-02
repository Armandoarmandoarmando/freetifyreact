const API_URL = import.meta.env.VITE_API_URL;

export async function fetchData() {
  const res = await fetch(`${API_URL}/`);
  if (!res.ok) throw new Error("Error al obtener datos");
  return res.json();
}

export async function searchContent(query, type = 'songs') {
  const endpoint = type === 'songs' ? `/freetify/songs/${query}` : `/freetify/artist/${query}`;
  const res = await fetch(`${API_URL}${endpoint}`);
  if (!res.ok) throw new Error("Error al buscar contenido");
  return res.json();
}

export async function initiateSpotifyLogin() {
  const res = await fetch(`${API_URL}/auth/login`);
  if (!res.ok) throw new Error("Error al iniciar login");
  return res.json();
}

export async function handleSpotifyCallback(code, state) {
  const res = await fetch(`${API_URL}/auth/callback?code=${code}&state=${state}`);
  if (!res.ok) throw new Error("Error en callback de Spotify");
  return res.json();
}

export async function refreshSpotifyToken(refreshToken) {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Error al refrescar token");
  return res.json();
}

export async function getUserProfile(accessToken) {
  const res = await fetch(`${API_URL}/auth/me?access_token=${accessToken}`);
  if (!res.ok) throw new Error("Error al obtener perfil del usuario");
  return res.json();
}

export async function getUserPlaylists(accessToken, limit = 20, offset = 0) {
  const res = await fetch(`${API_URL}/auth/playlists?access_token=${accessToken}&limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error("Error al obtener playlists del usuario");
  return res.json();
}

export async function getPlaylistDetails(playlistId, accessToken) {
  const res = await fetch(`${API_URL}/auth/playlist/${playlistId}?access_token=${accessToken}`);
  if (!res.ok) throw new Error("Error al obtener detalles de la playlist");
  return res.json();
}

export async function getUserTopTracks(accessToken, timeRange = 'medium_term', limit = 20) {
  const res = await fetch(`${API_URL}/auth/top-tracks?access_token=${accessToken}&time_range=${timeRange}&limit=${limit}`);
  if (!res.ok) throw new Error("Error al obtener top tracks del usuario");
  return res.json();
}

export async function getUserTopArtists(accessToken, timeRange = 'medium_term', limit = 20) {
  const res = await fetch(`${API_URL}/auth/top-artists?access_token=${accessToken}&time_range=${timeRange}&limit=${limit}`);
  if (!res.ok) throw new Error("Error al obtener top artists del usuario");
  return res.json();
}

export async function requestTrackStream({
  trackName,
  artists = [],
  album,
  spotifyTrackId,
  youtubeQueryOverride,
  durationMs,
}) {
  const res = await fetch(`${API_URL}/streams/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      track_name: trackName,
      artists,
      album,
      spotify_track_id: spotifyTrackId,
      youtube_query_override: youtubeQueryOverride,
      duration_ms: durationMs,
    }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Error al iniciar el stream');
  }

  return res.json();
}

export async function fetchCachedTrack(cacheKey) {
  const res = await fetch(`${API_URL}/streams/cache/${cacheKey}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error('Track no disponible en caché');
  }
  return res;
}

export async function fetchRecommendations(trackId, limit = 10) {
  if (!trackId) {
    throw new Error('trackId es requerido para obtener recomendaciones');
  }

  const params = new URLSearchParams({ track_id: trackId });
  if (limit) {
    params.set('limit', String(limit));
  }

  const res = await fetch(`${API_URL}/freetify/recomendaciones?${params.toString()}`);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Error al obtener recomendaciones');
  }

  return res.json();
}
