const neo4j = require('neo4j-driver');

const URI = 'bolt://localhost:7687'; 
const USER = 'neo4j';
const PASSWORD = 'Neo4j.haslo'; 

const driver = neo4j.driver(
    URI, 
    neo4j.auth.basic(USER, PASSWORD),
    { disableLosslessIntegers: true }
);

async function testNeo4jConnection() {
    try {
        const serverInfo = await driver.getServerInfo();
        console.log('Sukces! Połączono z bazą Neo4j!');
    } catch (error) {
        console.error('Błąd połączenia z Neo4j.', error.message);
    }
}

testNeo4jConnection();

module.exports = driver;