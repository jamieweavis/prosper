# Prosper

> 💎 Rocket League Garage trade aggregation & reporting CLI tool

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard) [![npm-downloads](https://img.shields.io/npm/dt/prosper.svg)](https://www.npmjs.com/package/prosper) [![npm-version](https://img.shields.io/npm/v/prosper.svg)](https://www.npmjs.com/package/prosper) [![license](https://img.shields.io/github/license/jamiestraw/prosper.svg)](LICENSE.md)

## 📦 Install

Prosper is installed globally via the command line from the npm registry with either [yarn](https://github.com/yarnpkg/yarn) or [npm](https://github.com/npm/npm).

```sh
# Via yarn (recommended)
$ yarn global add prosper

# Via npm
$ npm install --global prosper
```

## 🖥 Screenshots

Coming soon™

## 🚀 Commands

### `help`

Outputs detailed usage and help information.

### `list`

> alias: `ls`

Display list of items & modifiers with corresponding IDs

### `sell-offers <item-id> [options]`

> alias: `sell`

Display sell offer prices for the specified `<item-id>`

- **\<item-id>**: Unique item ID
- **[options]**:
    - **--certification \<tag>** - Item certification tag e.g. "Striker" - default: "None"
    - **--paint \<colour>** - Item paint colour e.g. "Titanium White" - default: "None"
    - **--platform \<name>** - Trade platform e.g. "PlayStation" - default: "Steam"
    - **-p, --page \<number>** - Page number e.g. 2 - default: 1

###### Examples:

```sh
# Display sell offer prices for Heatwave (Black Market)
$ prosper sell-offers 463

# Display sell offer prices for Octane (Titanium White)
$ prosper sell-offers 1 --paint="Titanium White"
```

### `buy-offers <item-id> [options]`

> alias: `buy`

Display buy offer prices for the specified `<item-id>`

- **\<item-id>**: Unique item ID
- **[options]**:
    - **--certification \<tag>** - Item certification tag e.g. "Striker" - default: "None"
    - **--paint \<colour>** - Item paint colour e.g. "Titanium White" - default: "None"
    - **--platform \<name>** - Trade platform e.g. "PlayStation" - default: "Steam"
    - **-p, --page \<number>** - Page number e.g. 2 - default: 1

###### Examples:

```sh
# Display buy offer prices for Heatwave (Black Market)
$ prosper buy-offers 463

# Display buy offer prices for Octane (Titanium White)
$ prosper buy-offers 1 --paint="Titanium White"
```

## 🔗 Related

[Dodgem](https://github.com/jamiestraw/dodgem) - 🎪 Rocket League Garage trade bumping automation CLI bot
## 📄 License

This project is licensed under the MIT License - see [LICENSE.md](LICENSE.md) for details.
