# 🎬 Movie Match

A full-stack web application for managing a personal movie library, rating films and getting personalized recommendations.

Movie Match is the practical part of my Master's thesis:
**"A Comparative Performance Analysis of Relational and Graph Databases: A Study of PostgreSQL and Neo4j"**.
The same features are implemented on top of both databases, so their performance can be measured and compared under identical conditions.

## ✨ Features

- **Movie database** – browse detailed information about movies, including descriptions, genres and release years.
- **Rating system** – rate movies on a star scale; ratings directly feed the recommendation algorithm.
- **Watchlist** – save movies you want to watch later.
- **Personalized recommendations** – suggestions based on your ratings and on the activity of users with similar taste.
- **Social discovery** – follow other users and get recommendations based on what people you follow are watching.

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | Vue.js, Bootstrap |
| Backend | Node.js, Express.js |
| Databases | PostgreSQL (relational), Neo4j (graph) |
| Infrastructure | Docker Desktop – fully containerized database environment for reproducible tests |

## 📁 Project Structure

```
Movie-Match/
├── frontend/   # Vue.js client application
├── server/     # Node.js + Express API, database services
└── DBdata/     # data used to populate the databases
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Installation

1. Clone the repository:
```bash
   git clone https://github.com/joanna-koczynska/Movie-Match---web-app.git
   cd Movie-Match---web-app
```
2. Start the PostgreSQL and Neo4j containers in Docker.
3. Install dependencies and run the backend:
```bash
   cd server
   npm install
   npm start
```
4. In a new terminal, install dependencies and run the frontend:
```bash
   cd frontend
   npm install
   npm run dev
```

## 📊 Data Source

Movie information and user ratings come from the [MovieLens](https://grouplens.org/datasets/movielens/) dataset provided by GroupLens Research.

<img width="1897" height="707" alt="image" src="https://github.com/user-attachments/assets/3525a801-0a2b-4f50-ae2b-bae3afd057ce" />

<img width="1899" height="916" alt="image" src="https://github.com/user-attachments/assets/1267dbd8-0131-4556-b911-176c05072711" />

<img width="1909" height="902" alt="image" src="https://github.com/user-attachments/assets/406716d9-fe6c-4ab6-83c6-8644dd8a529f" />

<img width="1892" height="906" alt="image" src="https://github.com/user-attachments/assets/c23f98e9-7219-4330-ba63-994fd35287a3" />
