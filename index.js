const fs = require('fs');
const robin = require('roundrobin');
const Chance = require('chance');
const csvStringify = require('csv-stringify/lib/sync');
const moment = require('moment');

const teamOrderChance = Chance(12345);
const homeChance = Chance(12345);
const locationChance = Chance(12345);

const isExhibition = false
const selectedDivisionIdx = 0;  // TODO: Get rid of this, and run in a loop.
const gamedates = [
  '9/26/2020',
  '10/3/2020',
  '10/10/2020',
  '10/17/2020',
  '10/24/2020',
  '10/31/2020',
  '11/7/2020',
];
const gameslotsYmca = [
    {location: 'YMCA', court: 'Court 1', time: '11:00 AM'},
    {location: 'YMCA', court: 'Court 2', time: '11:00 AM'},
    {location: 'YMCA', court: 'Court 1', time: '12:00 PM'},
    {location: 'YMCA', court: 'Court 2', time: '12:00 PM'}
]
const gameslotsScbc = [
    {location: 'SCBC', court: 'Court 1', time: '9:00 AM'},
    {location: 'SCBC', court: 'Court 1', time: '10:00 AM'},
    {location: 'SCBC', court: 'Court 1', time: '11:00 AM'},
    {location: 'SCBC', court: 'Court 1', time: '12:00 PM'}
]

const divisions = [
    { name: '3rd-4th', id: '5957249', slots: gameslotsYmca, teams: [
        { name: 'Adams', id: '5957265' },
        { name: 'BWhite', id: '5957242' },
        { name: 'Connell', id: '5957264' },
        { name: 'Foster', id: '5957243' },
        { name: 'Kenton', id: '5957240' },
        { name: 'Lorimer', id: '5957267' },
        { name: 'McFarland', id: '5957262' },
        { name: 'Nichols', id: '5957241' }
    ]},
    { name: '5th-6th', id: '5957250', slots: gameslotsScbc, teams: [
        { name: 'Erwin', id: '5957273' },
        { name: 'Grona', id: '5957275' },
        { name: 'KWhite', id: '5957280' },
        { name: 'Kresta', id: '5957279' },
        { name: 'Lux', id: '5957271' },
        { name: 'Schwann', id: '5957276' },
        { name: 'Thompson', id: '5957277' },
        { name: 'Zenor', id: '5957281' }
    ]}
]

games = []

const division = divisions[selectedDivisionIdx];
const teams = teamOrderChance.shuffle(division.teams);
const gamedays = robin(teams.length);

for(var gameday = 0; gameday < gamedays.length; ++gameday) {
    console.log(`Gameday #${gameday+1} (${gamedates[gameday]})`);
    const matches = gamedays[gameday];
    const slots = locationChance.shuffle(division.slots);

    for(var matchnum = 0; matchnum < matches.length; ++matchnum) {
        match = homeChance.shuffle(matches[matchnum]);
        const [ homeTeamNum, awayTeamNum ] = match;
        const homeTeam = teams[homeTeamNum - 1];
        const awayTeam = teams[awayTeamNum - 1];
        const slot = slots[matchnum];
        console.log(`${homeTeamNum} at ${awayTeamNum}. ${awayTeam.name} at ${homeTeam.name}. ${slot.location} ${slot.court} ${slot.time}`);
        const gamedate = gamedates[gameday];
        const endtime = moment(slot.time, 'LT').add({ hours: 1 }).format('LT');
        games.push({
            Start_Date: gamedate,
            Start_Time: slot.time,
            End_Date: gamedate,
            End_Time: endtime,
            Title: `${awayTeam.name} at ${homeTeam.name}`,
            Description: isExhibition ? 'Exhibition': '',
            Location: slot.location,
            Location_Details: slot.court,
            All_Day_Event: 0,
            Event_Type: 'Game',
            Team1_ID: homeTeam.id,
            Team1_Division_ID: division.id,
            Team1_Is_Home: true,
            Team2_ID: awayTeam.id,
            Team2_Division_ID: division.id,
            Affects_Standings: isExhibition ? 0 : 1
        });
    }
}

/**
TODO : Checks
- Number of games per team
- No duplicates on game day (ie each team plays 1 game).  Maybe a min/max is best.  In this case, expecting 1/1
- All games unique opponent
- Number of slots per team (checks for always getting the same slot)
- Home vs away count.
*/
const teamChecksById = {}
division.teams.forEach(team => {
    teamChecksById[team.id] = {
        team: team,
        gamedates: [],
        opponents: [],
        uniqueLocations: new Set(),
        home_cnt: 0
    }
});

function accumulateGameCheck(game, teamChecks, isHome, opponentId) {
    if(isHome) {
        ++teamChecks.home_cnt;
    }
    teamChecks.gamedates.push(game.Start_Date);
    teamChecks.opponents.push(opponentId);
    teamChecks.uniqueLocations.add(game.Location + game.Start_Time);
}

games.forEach(game => {
    accumulateGameCheck(game, teamChecksById[game.Team1_ID], true, game.Team2_ID);
    accumulateGameCheck(game, teamChecksById[game.Team2_ID], false, game.Team1_ID);
});
console.log();
function analyzeTeamChecks(teamChecks) {
    const totalGames = teamChecks.gamedates.length;
    const uniqueDates = (new Set(teamChecks.gamedates)).size;
    const uniqueOpponents = (new Set(teamChecks.opponents)).size;
    const uniqueSlots = teamChecks.uniqueLocations.size;
    console.log(`${teamChecks.team.name}: ${totalGames} total games, ${uniqueDates} dates, ${uniqueOpponents} opponents, ${uniqueSlots} slots.`)
}
Object.values(teamChecksById).forEach(teamChecks => analyzeTeamChecks(teamChecks));
console.log();

const csvData = csvStringify(games, { header: true });
console.log(csvData);
fs.writeFileSync(`game_schedule.${division.name}.csv`, csvData);