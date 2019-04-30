<h1 align="center">
  timemap
</h1>

<p align="center">
  <strong>timemap is a tool for exploration, monitoring and classification of incidents in time and space.</strong><br>
</p>
<p align="center">
  <a href="https://github.com/forensic-architecture/timemap/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="timemap is released under the MIT license." />
  </a>
  <a href="https://travis-ci.com/forensic-architecture/timemap">
    <img src="https://travis-ci.com/forensic-architecture/timemap.svg?branch=develop" alt="Build Status"/>
  </a>
</p>

## Overview

timemap is a standalone frontend application that allows to explore and monitor events in time and space. timemap uses [mapbox](https://www.mapbox.com/) satellite imagery as a backdrop by default, and uses Leaflet and d3 to visually map information.

The application is backend agnostic. It does, however, have some requirements regarding the format of incoming data. timemap is designed to work well in tandem with [datasheet-server](https://github.com/breezykermo/datasheet-server). This makes it particularly useful for journalist, activists, and other general users who are used to working with spreadsheets, as the timemap/datasheet-server combination effectively allows users to create an interactive platform for geospatial events using only a spreadsheet as a backend.

timemap has the following high-level features capabilites:

* Visualize events (incidents distinct in time and/or space) on a map.
* Filter events with respect  on an adjustable timeline, zooming in and out.
* Filter events by either tag or category, mechanisms to associate related
    events and display them with different styles.

timemap is the result of generalising the platform that Forensic Architecture developed for the [Ayotzinapa case](https://www.plataforma-ayotzinapa.org), an investigation of an attack on school students coordinated by criminal organisations in collusion with local police.

## Get up and running

### Requirements

To run a timemap instance, you'll need:

* Git, node, and npm/yarn.
* A backend that serves data. We recommend using [datasheet-server](https://github.com/breezykermo/datasheet-server), which allows you to turn a Google Spreadsheet into an appropriate server. To set this up, follow [the detailed tutorial](https://github.com/forensic-architecture/timemap/wiki/Setting-up-a-local-instance-of-Timemap) on the wiki.
* A (free) account at Mapbox, so that you can get a token. timemap uses Mapbox to power the satellite imagery in the map's backdrop. If you don't want to use Mapbox, timemap will default to using [OpenStreetMap](https://www.openstreetmap.org).

### Getting started

Open a bash/zsh shell:

1. Pull this repository.

```shell
git clone https://github.com/forensic-architecture/timemap
```

2. Install dependencies via yarn (recommended, it's just faster) or npm.

```shell
yarn          # npm install
```

3. Create a configuration file from the example:
```shell
cp example.config.js config.js
```

4. Run the development server via yarn:

```shell
yarn dev      # npm run dev
```

Congratulations! You now have a running local instance of timemap. If you now visit [localhost:8080](http://localhost:8080), you should be greeted with an alert that tells you that timemap could not locate a server. In order to display interesting information, you'll need a backend to provide timemap events. This is covered in the next section.

### Serving data

In order to see anything interesting on a timemap instance, you will need to have a way to serve data to it. The easiest way is to create the appropriate routes through [datesheet-server](), another Forensic Architecture open source project that has been developed as a configurable proxy between a frontend application (such as a timemap instance) and a Google Spreadsheet. It is thought for users that do not want or know how to run their own server or backend application.

However, you can also use timemap as a frontend for a different type of server, for instance pulling information from a relational database.

#### Data requirements

timemap is backend agnostic, but it requires a series of endpoints to provide data for it to visualize. The data is expected in JSON format. Some data elements are required and their format has some required fields. Other additional endpoints are optional, and if enabled, they simply add features to your taste.

The combination of all these data types is called the `domain` of the application in the context of timemap.

#### Required endpoints

1. Events: incidents to be mapped in time and space are called `events`. They must include the following fields:

```json
[
  {
    "desc":"SOME DESCRIPTION TEXT",
    "date":"8/23/2011",
    "time":"18:30",
    "location":"LOCATION_NAME",
    "lat":"17.810358",
    "long":"-18.2251664",
    "source":"",
    "tags": "",
    "category": ""
  },
  {}
]

```

Events can have zero, one or multiple tags (comma-separated in one single string), but MUST have one, and only one, category. Category properties are also a required endpoint.

2. Categories: events must be grouped in `categories`. All `events` must contain one (and only one) `category` for them to be displayed in the timeline and map. They are designed to aggregate incidents, for example, according to a population group, or obtained by a type of measure. Categories can be bundled in groups.

```json
[
  {
    "category":"Category 00",
    "category_label":"Category Label",
    "group":"category_group00",
    "group_label":"Events"
  },
  {}
]
```

#### Optional endpoints

3. Tags: `events` can be tagged by multiple `tags`. These will further characterize the event, and allow to select or deselect based on them. Tags are or can be distributed in a tree-like hierarchy, and each node on the tree can be a tag, including those who are not leafs.

```json
{  
   "key":"tags",
   "children":{  
      "tag0":{  
         "key":"tag0 ",
         "children":{  
            "tag00":{  
               "key":"tag00",
               "children":{  
                 "tag001":{  
                    "key":"tag001",
                    "children":{}
                 }
               }
            },
            "tag01":{  
               "key":"tag01",
               "children":{}
            },            
         }
      },
      "tag1":{  
         "key":"tag1",
         "children":{  
            "tag10":{  
               "key":"tag10",
               "children":{}
            }
         }
      },
   }
}

```

4. Sites: sites are labels on the map, aiming to highlight particularly relevant locations that should not be a function of time or tags.

```json
[
  {
    "id":"1",
    "description":"SITE_DESCRIPTION",
    "site":"SITE_LABEL",
    "latitude":"17.810358",
    "longitude":"-18.2251664"
  },
  {}
]
```

### Configuration

The application will require to include a few configuration settings. Configuration options are to be set in [app/config.js](app/config.js). You will find a file named `app/config.example.js` which you can copy as an example. It contains the following fields:

| Option  | Description | Type | Nullable |
| ------- | ----------- | ---- | -------- |
| title | Title of the application, display in the toolbar | String | No |
| SERVER_ROOT | Base URI for the server | String | No |
| EVENT_EXT | Endpoint for events, which will be concatenated with SERVER_ROOT | String | No |
| EVENT_DESC_ROOT | Endpoint for additional metadata for each individual event, concatenated to SERVER_ROOT | String | Yes |
| CATEGORY_EXT | Endpoint for categories, concatenated with SERVER_ROOT | String | Yes |
| NARRATIVE_EXT | Endpoint for narratives, concatenated with SERVER_ROOT | String | No |
| TAG_TREE_EXT | Endpoint for tags, concatenated with SERVER_ROOT | String | Yes |
| SITES_EXT | Endpoint for sites, concatenated with SERVER_ROOT | String | Yes |
| MAP_ANCHOR | Geographic coordinates for original map anchor | Array of numbers | No |
| MAPBOX_TOKEN | Access token for Mapbox satellite imagery | String | No |
| features.USE_TAGS | Enable / Disable tags | boolean | No |
| features.USE_SEARCH | Enable / Disable search | boolean | No |
| features.USE_SITES | Enable / Disable sites | boolean | No |

In this configuration file you'll need to add your Mapbox token (see [here for more info](https://www.mapbox.com/help/define-access-token/)). Additionally, you'll need to replace the required endpoints by functioning ones. Finally, you'll want to initialize your application set in `MAP_ANCHOR`, as a (lat, long) pair, which determines the specific location at which the application will center itself on start.

## For developers

If you'd like to tailor the functionality of timemap to your use case, you can consult the [Wiki]() for more detailed documentation of the architecture of timemap.

## Contribute

### [Code of Conduct](CODE_OF_CONDUCT.md)

Please read our adopted [code of conduct](CODE_OF_CONDUCT.md) before contributing, so that you can understand what actions will and will not be tolerated.

### [Contributing Guide](CONTRIBUTING.md)

Read our [contributing guide](CONTRIBUTING.md) to learn about our development process, how to propose bugfixes and improvements.

## Community
If you have any questions or just want to chat, please join our team [fa_open_source](https://keybase.io/team/fa_open_source) on Keybase for community discussion. Keybase is a great platform for encrypted chat and file sharing.

## License

timemap is distributed under the MIT License.
