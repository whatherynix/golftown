import fs from 'fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
// We can't easily SSR it because it's a client Vite app with CSS imports.
// But we can check if there are any syntax errors in the built files.
