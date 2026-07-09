# CivicReel — Product Requirements

## Overview
Instagram-Reels-style mobile app for reporting civic problems (potholes, waste, power outages, water, pollution, etc.). Users capture a photo, describe the problem, tag a category, optionally tag other users, and share it to a full-screen swipeable feed.

## Users
Any citizen who wants to raise civic issues; local officials, activists and neighbours who follow those reports.

## Auth
- Google Social Login (Emergent-managed OAuth).
- On first login users are guided through onboarding to set: full name, username (unique), country, state, slogan.

## Core Features
1. **Reels-style Feed** — vertical full-screen paged FlatList; right-side glass action stack (like, comment, share) + bottom gradient scrim with author + description + category pill.
2. **Post creation (`+` tab)** — camera capture OR gallery pick → compose (description, category chips, tag @usernames) → single-tap post. Photos stored as base64 in MongoDB.
3. **Search** — segmented "Problems | Users". Problems supports category filter chips (electricity, water, road, pollution, wastage, sanitation, traffic, safety, corruption, other) + free-text search. Users search by name / @username.
4. **Profile** — cover, avatar, name/username/location/slogan, editable, 3-column grid of user's own reports; logout.
5. **Engagement** — like toggle (optimistic), comments modal, comment counts and like counts.

## Tech
- Frontend: Expo Router (React Native), dark theme "6 Glass / Luxe DARK", expo-camera + expo-image-picker for photos, expo-blur for bottom tab glass, expo-linear-gradient for scrims.
- Backend: FastAPI + Motor MongoDB. All routes prefixed `/api`. Collections: `users`, `user_sessions`, `posts`, `likes`, `comments`. TTL index on session expiry.

## Categories
electricity, water, road, pollution, wastage, sanitation, traffic, safety, corruption, other.

## Business Enhancement Idea (future)
"Authority Verification" badge — municipal officials / NGOs can claim a verified handle so citizens know when a real actor has responded, converting posts into resolvable tickets.
