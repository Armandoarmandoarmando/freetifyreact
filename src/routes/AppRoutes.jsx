import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import App from '../App';
import Login from '../views/Login';
import Home from '../views/Home';
import Search from '../views/Search';
import Playlists from '../views/Playlists';
import Profile from '../views/Profile';
import SpotifyCallback from '../components/SpotifyCallback';
import ArtistSongs from '../views/ArtistSongs';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<App />} />
      <Route path="/login" element={<Login />} />
      <Route path="/callback" element={<SpotifyCallback />} />
      
      {/* Rutas protegidas con drawer */}
      <Route path="/home" element={<Home />}>
        <Route index element={<Navigate to="search" replace />} />
        <Route path="search" element={<Search />} />
        <Route path="playlists" element={<Playlists />} />
        <Route path="profile" element={<Profile />} />
        <Route path="artist/:artistName" element={<ArtistSongs />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
