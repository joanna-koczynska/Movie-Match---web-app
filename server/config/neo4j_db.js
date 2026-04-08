const neo4j = require('neo4j-driver');

// --- KONFIGURACJA POŁĄCZENIA ---
// Neo4j używa protokołu "bolt" (port 7687) do komunikacji z aplikacjami
const URI = 'bolt://localhost:7687'; 
const USER = 'neo4j';
const PASSWORD = 'Neo4j.haslo'; // Zgodnie z NEO4J_AUTH w Twoim docker-compose.yml

// Tworzymy główny sterownik (driver), który będzie zarządzał pulą połączeń
const driver = neo4j.driver(
    URI, 
    neo4j.auth.basic(USER, PASSWORD),
    { disableLosslessIntegers: true }
);

// --- TEST POŁĄCZENIA ---
// Ta funkcja uruchomi się automatycznie i sprawdzi, czy aplikacja widzi bazę
async function testNeo4jConnection() {
    try {
        const serverInfo = await driver.getServerInfo();
        console.log('✅ Sukces! Połączono z bazą Neo4j! Wersja serwera:', serverInfo.version);
    } catch (error) {
        console.error('❌ Błąd połączenia z Neo4j. Sprawdź, czy kontener w Dockerze działa.', error.message);
    }
}

testNeo4jConnection();

// Eksportujemy sterownik, aby inne pliki mogły z niego korzystać
module.exports = driver;