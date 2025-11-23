# inquirerer

<p align="center" width="100%">
    <img height="90" src="https://user-images.githubusercontent.com/545047/190171475-b416f99e-2831-4786-9ba3-a7ff4d95b0d3.svg" />
</p>

<p align="center" width="100%">

  <a href="https://github.com/hyperweb-io/dev-utils/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/hyperweb-io/dev-utils/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://github.com/hyperweb-io/dev-utils/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/inquirerer"><img height="20" src="https://img.shields.io/npm/dt/inquirerer"></a>
  <a href="https://www.npmjs.com/package/inquirerer"><img height="20" src="https://img.shields.io/github/package-json/v/hyperweb-io/dev-utils?filename=packages%2Finquirerer%2Fpackage.json"></a>
</p>

This library is designed to facilitate the creation of command-line utilities by providing a robust framework for capturing user input through interactive prompts. It supports a variety of question types, making it highly flexible and suitable for a wide range of applications.

## Install

```sh
npm install inquirerer
```

## Features

- 🖊 **Multiple Question Types:** Support for text, autocomplete, checkbox, and confirm questions.
- 🛠 **Customizable Prompts:** Easily configure prompts to include default values, requirement flags, and custom validation rules.
- 🔎 **Interactive Autocomplete:** Dynamically filter options based on user input.
- ✔️ **Flexible Checkbox Selections:** Allow users to select multiple options from a list.

## Table of Contents

- [Introduction](#inquirerer)
  - [Install](#install)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Example Questions](#example-questions)
    - [Text Question](#text-question)
    - [Confirm Question](#confirm-question)
    - [Autocomplete Question](#autocomplete-question)
    - [Checkbox Question](#checkbox-question)
  - [Executing a Prompt](#executing-a-prompt)
- [Developing](#developing)
- [Credits](#credits)
- [Disclaimer](#disclaimer)

## Installation

To install the library, use `npm` or `yarn`:

```bash
npm install inquirerer
```

## Usage

Import the library and use it to create prompts for your command-line application:

```js
import { Inquirerer } from 'inquirerer';
```

### Example Questions

Here are several examples of different question types you can use:

#### Text Question

```js
{
  type: 'text',
  name: 'firstName',
  message: 'Enter your first name',
}
```

#### Confirm Question

```js
{
  type: 'confirm',
  name: 'continue',
  message: 'Do you wish to continue?',
  default: true,
}
```

#### Autocomplete Question

```js
{
  type: 'autocomplete',
  name: 'fruitChoice',
  message: 'Select your favorite fruit',
  options: [
    'Apple', 'Banana', 'Cherry'
  ],
  maxDisplayLines: 5
}
```

#### Checkbox Question

```js
{
  type: 'checkbox',
  name: 'techStack',
  message: 'Choose your tech stack',
  options: [
    'Node.js', 'React', 'Angular', 'Vue.js'
  ],
  returnFullResults: false,
  required: true
}
```

### Executing a Prompt

To run a prompt and handle the response:

```js
const prompter = new Inquirerer();

async function runPrompt() {
  const responses = await prompter.prompt({}, [
    {
      type: 'text',
      name: 'lastName',
      message: 'Enter your last name',
      required: true
    },
    {
      type: 'checkbox',
      name: 'devTools',
      message: 'Select development tools:',
      options: ['VS Code', 'Sublime', 'Atom'],
      required: true
    }
  ]);

  console.log(responses);
}

runPrompt();
```


## Developing


When first cloning the repo:
```
yarn
yarn build
```

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED “AS IS”, AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
