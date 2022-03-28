# MMM-LeagueOfLegends

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/).

A module to display your League Of Legends stats on your MagicMirror².

## Requirements

1. Riotgames Developer Profile
2. Riotgames Developer API-Key

Both of those are free to create, although it **might take a few days**, to get your application verified!

To use this module, you first need to sign up for the [Riotgames Developer Program](https://developer.riotgames.com/).

Next you need to register your Application with a `PERSONAL API KEY` by clicking the "Register Product"-Button on your Dashboard and selecting "Personal API Key". You then have to fillout a short from with information about the purpose of your "product" and submit this.

For me, it took a few days to get my application registered.

If your App is registered, you can head over to your "Apps" (by clicking on your username in the upper right corner and selecting "Apps") and choose your App on the left hand side. You should now see general Information about your App along with an "API-Key", looking something like this: `RGAPI-291b3053-432c-737l-28aj-416d3j21ag28` (not a real key, just an example!)

You are then ready to use this module.

## Installation

1. Navigate to your modules folder in a terminal:

```bash
cd ~/MagicMirror/modules
```

2. Clone this repository:

```bash
git clone https://github.com/JulianEgbert/MMM-LeagueOfLegends.git
```

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:

```js
var config = {
    modules: [
      {
        module: 'MMM-LeagueOfLegends',
        position: "middle_center",
        config: {
          summonerName: "<YOUR_SUMMONER_NAME>",
          region: "euw1",
          queueType: "RANKED_SOLO_5x5",
          apiKey: "<YOUR_RIOT_API_KEY>",
          displayElements: [
            {
              name: "tier",
              config: {
                hideDetailedRankInfo: true
              }
            },
            {
              name: "stats",
              config: {
                showHotStreak: true
              }
            }
          ],
        }
      },
    ]
}
```

## Configuration options

| Option           | Description
|----------------- |-----------
| `apiKey`         | *Required* Your own API-Key for the Riot API.
| `summonerName`   | *Required* Your summoner name.
| `displayElements`| *Required* The elements that should be displayed in this module. **Type**: Array of objects or strings, see below.
| `region`         | *Required* The region you are playing in (as stated in the riot api description). <br> **Default**: `euw1`
| `imageFolder`    | *Optional* The path to the folder with the tier icons. <br> **Values**: `"emblems"` (**default**, new icons), `"tiers"` (old icons)
| `iconSize`       | *Optional* Size of the tier icon. <br> **Default:** 256
| `queueType`      | *Optional* The queue you want to display your Elo from. <br> **Values**: `"RANKED_SOLO_5x5"` (**default**, Solo-Queue), `"RANKED_FLEX_SR"` (Flex-Queue)
| `showOtherQueueIfNotFound` | *Optional* Whether the module should display another queue elo if specified queue is not found. <br>**Type:** Boolean, **Default:** true


## Display Elements

Here is an overview of all the supported display elements. They are either just a name or an object with `name` and `config` for optional configurations. If no config is provided, default values will be used.

| Option        | Description
|---------------|-----------
| `tier`        | Displays the icon of your rank. <br> **Config**: `hideDetailedRankInfo`: *boolean* (**default** `false`), wether or not to display the tier name, division and LP.
| `stats`       | Displays the stats for this queue (Wins, Losses, Winrate). <br> **Config**: `showHotStreak`: *boolean* (**default** `false`), wether or not to display a flame icon, when the summoner has a hotstreak (provided by the riot API).
| `summoner`    | Displays the summoner name. <br> **Config**: `showLevel`: *boolean* (**default** `false`), wether or not to display the level of the user.
| `history`     | Displays the latest games with brief information. <br> **Config**: `count` (default `5`): number of matches to display. <br> `showTime` (default `true`): display date of game and game duration. <br> `showStats` (default `true`): display stats of the game (kda and cs). <br> `showQueue` (default `true`): display queue and win or loss. <br> `showChampion` (default `true`): display the champion splashart. <br> `iconSize` (default `64`): size of the champion icon in the history <br> `csPerMinute` (default `true`): display cs per minute after cs score.

