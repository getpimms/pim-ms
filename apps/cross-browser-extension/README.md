# Cross browser extension

# Setup Instructions

## Prerequisites

Make sure you have Node.js and pnpm installed.

## Installation

```bash
# Install dependencies
pnpm install
```

## Development

```bash
# Start development server
pnpm dev
```

## Building

```bash
pnpm build
```

## Loading in Chrome

1. Build the extension first
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" button
5. Select the `build` folder that was created