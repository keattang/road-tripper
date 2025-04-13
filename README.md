# road-tripper

This app is an experiment to see what's possible with LLM coding. It was built using Cursor and not a single line of code has been read or hand written. It was entirely created by chatting to the Cursor agent. 

## Description

This is a frontend application, built in React, Typescript and MUI, used to help plan and map out a road trip. It uses the Google Maps SDK to plot out the trip, calculate driving times and mark out points of interest along the way. 

The basic layout of the app is:
- A left hand side panel that contains a list of MUI cards, each representing a stop
- A map that fills the rest of the screen to the right that has all the stops and points of interest on it

In the left hand side panel, each card contains a location and an arrival date. Using the arrival date of the next card, the number of nights stayed at the location is displayed on each card. When there is no next card the number of nights is not displayed. 

In between each card is a driving time between the locations of the cards. At the bottom of the panel is a button to add a new card, which adds a blank card to be filled in. There is also a calculation of the total number of days for the trip.

If you click into a card, it expands to show a list where you can enter nearby points of interest. For each point of interest, the driving time from the location on the card is displayed. There is a button at the bottom of the list to add a new point of interest.

The map displays the location of each card as red pins, the driving route between them and the driving time for each section of the route. It also displays the locations of all the points of interest as blue pins. 

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
