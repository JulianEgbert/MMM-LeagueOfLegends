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
          apiKey: "<YOUR_RIOT_API_KEY>"
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
| `region`         | *Required* The region you are playing in (as stated in the riot api description). <br> **Default**: `euw1`
| `imageFolder`    | *Optional* The path to the folder with the tier icons. <br> **Values**: `"emblems"` (**default**, new icons), `"tiers"` (old icons)
| `iconSize`       | *Optional* Size of the tier icon. <br> **Default:** 256
| `queueType`      | *Optional* The queue you want to display your Elo from. <br> **Values**: `"RANKED_SOLO_5x5"` (**default**, Solo-Queue), `"RANKED_FLEX_SR"` (Flex-Queue)
| `showOtherQueueIfNotFound` | *Optional* Whether the module should display another queue elo if specified queue is not found. <br>**Type:** Boolean, **Default:** true

