const fs = require('fs');
const fastify = require('fastify')();

// Use o caminho absoluto para garantir que está correto
const filePath = 'C:/Users/GUSTAVO/Desktop/Teste_backend_estagio/data/measurements.txt';

let sortedStations = []; // Variável global para armazenar as estações

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Erro ao ler o arquivo:', err);
        process.exit(1);
    }
    const parsedData = processFileContent(data);
    const stations = groupCitiesIntoStations(parsedData);
    sortedStations = sortStationsAlphabetically(stations);
});

fastify.get('/', (req, reply) => {
    const stationsWithoutTemperatures = sortedStations.map(station => {
        const { temperatures, ...rest } = station;
        return rest;
    });
    reply.send(stationsWithoutTemperatures);
});

fastify.get('/station/:name', (req, reply) => {
    const stationName = req.params.name;
    const stationData = sortedStations.filter(station => station.city === stationName);
    if (stationData.length === 0) {
        reply.code(404).send({ error: 'Estação não encontrada' });
        return;
    }

    // Busca todas as ocorrências da cidade correspondente e retorna com os cálculos e temperaturas
    const allInstances = stationData.map(station => {
        return {
            city: station.city,
            temperatures: station.temperatures,
            averageTemperature: station.averageTemperature,
            maxTemperature: station.maxTemperature,
            minTemperature: station.minTemperature,
            modeTemperature: station.modeTemperature,
        };
    });

    reply.send(allInstances);
});

fastify.get('/temperatura/:temperature', (req, reply) => {
    const temperature = parseFloat(req.params.temperature);
    if (isNaN(temperature)) {
        reply.code(400).send({ error: 'A temperatura deve ser um número válido' });
        return;
    }

    const stationsWithTemperature = sortedStations.filter(station => {
        return station.temperatures.includes(temperature);
    });

    const uniqueStations = [];
    const addedCities = new Set();
    stationsWithTemperature.forEach(station => {
        if (!addedCities.has(station.city)) {
            const { temperatures, ...stationWithoutTemperatures } = station;
            uniqueStations.push(stationWithoutTemperatures);
            addedCities.add(station.city);
        }
    });

    reply.send(uniqueStations);
});

fastify.listen({ port: 3000 }, (err, address) => {
    if (err) {
        console.error('Erro ao iniciar o servidor:', err);
        process.exit(1);
    }
    console.log(`Servidor rodando em ${address}`);
});

function processFileContent(content) {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const data = lines.map(line => {
        const [city, temperature] = line.split(';');
        return { city: city.trim(), temperature: parseFloat(temperature.trim()) };
    });
    return data;
}

function calculateAverageTemperature(temperatures) {
    const totalTemperature = temperatures.reduce((sum, temp) => sum + temp, 0);
    return totalTemperature / temperatures.length;
}

function findMaxTemperature(temperatures) {
    return Math.max(...temperatures);
}

function findMinTemperature(temperatures) {
    return Math.min(...temperatures);
}

function calculateModeTemperature(temperatures) {
    const frequency = {};
    temperatures.forEach(temp => {
        frequency[temp] = (frequency[temp] || 0) + 1;
    });

    let modeTemperature = temperatures[0];
    let maxFrequency = 0;
    for (const temp in frequency) {
        if (frequency[temp] > maxFrequency) {
            maxFrequency = frequency[temp];
            modeTemperature = parseFloat(temp);
        }
    }

    return modeTemperature;
}

function groupCitiesIntoStations(data) {
    const stations = {};
    data.forEach(entry => {
        if (!stations[entry.city]) {
            stations[entry.city] = { temperatures: [] };
        }
        stations[entry.city].temperatures.push(entry.temperature);
    });

    for (const city in stations) {
        const station = stations[city];
        station.city = city;
        station.averageTemperature = calculateAverageTemperature(station.temperatures);
        station.maxTemperature = findMaxTemperature(station.temperatures);
        station.minTemperature = findMinTemperature(station.temperatures);
        station.modeTemperature = calculateModeTemperature(station.temperatures);
    }

    return stations;
}

function sortStationsAlphabetically(stations) {
    return Object.values(stations)
        .sort((a, b) => a.city.localeCompare(b.city));
}
